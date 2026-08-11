/**
 * Suggested Lyric Back — Approach A.
 * Ranks eligible catalog lyric units with gpt-4o-mini as replies to a post.
 * Soft cross-song diversity assemble after the model returns best + bestOtherSong.
 * Caches successful non-empty final picks only (never caches hard failures or empty).
 */

import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCatalogLyricUnits,
  type CatalogLyricAtom,
} from '@/lib/catalog-lyric-unit'

export const SHORT_LINE_WORDS = 3
export const MIN_SUGGEST_UNIT_WORDS = 4
export const SUGGESTIONS_PER_POST = 3
export const SUGGEST_BATCH_MAX = 25

/**
 * Soft cap before we chunk. Current catalog (~400 units) fits one call;
 * keep chunk→merge only as a growth fallback.
 */
export const MAX_UNITS_PER_CALL = 500

/** Fresh non-empty cache TTL. */
export const CACHE_TTL_MS = 18 * 60 * 60 * 1000

const LLM_CONCURRENCY = 3
const OPENAI_MODEL = 'gpt-4o-mini'

export type SuggestedLyricBack = {
  text: string
  songTitle: string
  artistName: string
  songId: string
  lineIndex: number
  startSec: number
  endSec: number
  audioUrl?: string | null
  artworkUrl?: string | null
  /** Optional; used by snippet playback chrome. Not used for matching. */
  vibe: string
}

export type SuggestPostInput = {
  id: string
  emotion?: string | null
  text?: string | null
  songId?: string | null
  songTitle?: string | null
}

type EligibleUnit = {
  id: string
  text: string
  songId: string
  songTitle: string
  artistName: string
  lineIndex: number
  startSec: number
  endSec: number
  audioUrl: string | null
  artworkUrl: string | null
}

type PickOk = { ok: true; best: string[]; bestOtherSong: string[] }
type PickErr = { ok: false; reason: string }
type PickResult = PickOk | PickErr

export class SuggestRankError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SuggestRankError'
  }
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'\u2018\u2019\u201c\u201d]/g, '')
    .replace(/\s+/g, ' ')
}

function fingerprintUnits(units: EligibleUnit[]): string {
  const ids = units.map((u) => u.id).sort()
  return createHash('sha256').update(ids.join('|')).digest('hex').slice(0, 32)
}

function pickUnit(
  atoms: CatalogLyricAtom[],
  centerLineIndex: number,
): { text: string; startSec: number; endSec: number; lineIndex: number } | null {
  const built = buildCatalogLyricUnits(atoms, centerLineIndex)
  if (!built) return null
  const unit =
    wordCount(built.single.text) <= SHORT_LINE_WORDS
      ? built.window
      : built.single
  if (wordCount(unit.text) < MIN_SUGGEST_UNIT_WORDS) return null
  return {
    text: unit.text,
    startSec: unit.startSec,
    endSec: unit.endSec,
    lineIndex: unit.centerLineIndex,
  }
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []
  const results: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const idx = next++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx])
    }
  }
  const n = Math.min(limit, items.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  return results
}

/**
 * Load all eligible catalog lyric units (live songs, Moments/Suggested unit rules).
 * No vibe-tag gate — the LLM chooses replies by meaning.
 */
export async function loadEligibleCatalogUnits(
  supabase: SupabaseClient,
): Promise<EligibleUnit[]> {
  const { data: songRows, error: songErr } = await supabase
    .from('songs')
    .select('id, title, artist_display_name, artwork_url, audio_url')
    .eq('status', 'live')

  if (songErr) {
    console.error('loadEligibleCatalogUnits: songs query failed', songErr)
    return []
  }
  if (!songRows?.length) return []

  const songMeta = new Map(
    songRows.map((s) => [
      s.id as string,
      {
        title: s.title as string,
        artist: s.artist_display_name as string,
        artworkUrl: (s.artwork_url as string | null) ?? null,
        audioUrl: (s.audio_url as string | null) ?? null,
      },
    ]),
  )
  const songIds = [...songMeta.keys()]

  const { data: atomRows, error: atomErr } = await supabase
    .from('lyric_lines')
    .select('song_id, line_index, text, start_sec, end_sec')
    .in('song_id', songIds)

  if (atomErr) {
    console.error('loadEligibleCatalogUnits: lyric_lines query failed', atomErr)
    return []
  }

  const atomsBySong = new Map<string, CatalogLyricAtom[]>()
  for (const row of atomRows || []) {
    const list = atomsBySong.get(row.song_id) || []
    list.push({
      lineIndex: row.line_index,
      text: row.text,
      startSec: Number(row.start_sec),
      endSec: Number(row.end_sec),
    })
    atomsBySong.set(row.song_id, list)
  }
  for (const [, list] of atomsBySong) {
    list.sort((a, b) => a.lineIndex - b.lineIndex)
  }

  const units: EligibleUnit[] = []
  const seenRanges = new Set<string>()

  for (const [songId, atoms] of atomsBySong) {
    const meta = songMeta.get(songId)
    if (!meta || atoms.length === 0) continue
    for (const atom of atoms) {
      const unit = pickUnit(atoms, atom.lineIndex)
      if (!unit) continue
      const rangeKey = `${songId}_${unit.startSec}_${unit.endSec}`
      if (seenRanges.has(rangeKey)) continue
      seenRanges.add(rangeKey)
      const text = unit.text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
      if (!text) continue
      units.push({
        id: `${songId}:${unit.lineIndex}`,
        text,
        songId,
        songTitle: meta.title,
        artistName: meta.artist,
        lineIndex: unit.lineIndex,
        startSec: unit.startSec,
        endSec: unit.endSec,
        audioUrl: meta.audioUrl,
        artworkUrl: meta.artworkUrl,
      })
    }
  }

  units.sort((a, b) => {
    if (a.songId !== b.songId) return a.songId.localeCompare(b.songId)
    return a.lineIndex - b.lineIndex
  })
  return units
}

function chunkUnits<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function parseIdArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

function parseTwoList(raw: string): { best: string[]; bestOtherSong: string[] } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    const parsed = JSON.parse(cleaned) as {
      best?: unknown
      bestOtherSong?: unknown
      ids?: unknown
    }
    // Preferred shape.
    if (Array.isArray(parsed?.best) || Array.isArray(parsed?.bestOtherSong)) {
      return {
        best: parseIdArray(parsed.best),
        bestOtherSong: parseIdArray(parsed.bestOtherSong),
      }
    }
    // Legacy single-list fallback (should not be needed after deploy).
    if (Array.isArray(parsed?.ids)) {
      return { best: parseIdArray(parsed.ids), bestOtherSong: [] }
    }
    return null
  } catch {
    return null
  }
}

async function openaiPickTwoList(params: {
  postText: string
  parentSongTitle?: string | null
  parentSongId?: string | null
  units: EligibleUnit[]
  maxBest: number
}): Promise<PickResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, reason: 'OpenAI is not configured' }
  }
  if (params.units.length === 0) {
    return { ok: true, best: [], bestOtherSong: [] }
  }

  const catalogBlock = params.units
    .map((u) => `[${u.id}] "${u.text}" — ${u.songTitle} · ${u.artistName}`)
    .join('\n')

  const parentHint = params.parentSongTitle
    ? `The post quotes: ${params.parentSongTitle}${params.parentSongId ? ` (song_id ${params.parentSongId})` : ''}.`
    : 'The post may not be linked to a catalog song.'

  const parentSongClause = params.parentSongId
    ? `For "bestOtherSong", only include ids whose song is NOT song_id ${params.parentSongId}. Prefer [] over a stretch — only include a line if it would work as a real conversational Lyric Back to this post's meaning (not vague vibe overlap, not filler for variety). Language and meaning must actually answer the post. If none are strong enough, return [].`
    : `The parent has no catalog song_id. Return "bestOtherSong": [] (diversity is not applied in that case).`

  const system = `You help Margo suggest Lyric Backs — real catalog lyric lines that answer a user's post as a conversational reply.

Rules:
- Pick lines that genuinely respond to the meaning of the post (common sense / dialog), not just the same emotion category.
- Prefer a different song than the post's own song when an equally good reply exists in the overall best list.
- Never pick a line that is the same (or near-identical) as the post lyric.
- Only return ids from the provided list.
- Return JSON only, no markdown:
{"best":["id1","id2","id3"],"bestOtherSong":["idA"]}
- "best": up to ${params.maxBest} strongest replies from the FULL catalog list (any song). Fewer if only fewer are strong. [] if none.
- "bestOtherSong": up to 2 strongest cross-song replies.
- ${parentSongClause}`

  const user = `Post lyric:
"${params.postText}"

${parentHint}

Catalog lyric units:
${catalogBlock}`

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 300,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'network error'
    console.error('suggestLyricBacks: OpenAI fetch failed', message)
    return { ok: false, reason: 'Could not reach the suggestion service' }
  }

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error('suggestLyricBacks: OpenAI failed', res.status, err)
    return { ok: false, reason: `Suggestion service failed (${res.status})` }
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content || ''
  const parsed = parseTwoList(content)
  if (parsed == null) {
    console.error('suggestLyricBacks: OpenAI returned unparseable two-list', content.slice(0, 200))
    return { ok: false, reason: 'Could not parse suggestion response' }
  }
  return {
    ok: true,
    best: parsed.best.slice(0, params.maxBest),
    bestOtherSong: parsed.bestOtherSong.slice(0, 2),
  }
}

function hydrateSuggestions(
  ids: string[],
  byId: Map<string, EligibleUnit>,
  postTextNorm: string,
  vibe: string,
  max = SUGGESTIONS_PER_POST,
): SuggestedLyricBack[] {
  const picked: SuggestedLyricBack[] = []
  const seen = new Set<string>()

  for (const id of ids) {
    if (picked.length >= max) break
    const u = byId.get(id)
    if (!u || seen.has(u.id)) continue
    if (postTextNorm && normalizeText(u.text) === postTextNorm) continue
    seen.add(u.id)
    picked.push({
      text: u.text,
      songTitle: u.songTitle,
      artistName: u.artistName,
      songId: u.songId,
      lineIndex: u.lineIndex,
      startSec: u.startSec,
      endSec: u.endSec,
      audioUrl: u.audioUrl,
      artworkUrl: u.artworkUrl,
      vibe,
    })
  }

  return picked.slice(0, max)
}

/**
 * Soft cross-song slot: guarantee ≥1 other-song pick when the model
 * supplies a real bestOtherSong candidate. Never pad. Never delete a
 * sole/partial same-song best list — only replace the last of a full
 * 3-same-song set; otherwise append.
 */
export function assembleDiversifiedPicks(
  best: SuggestedLyricBack[],
  bestOther: SuggestedLyricBack[],
  parentSongId: string | null | undefined,
): SuggestedLyricBack[] {
  const top = best.slice(0, SUGGESTIONS_PER_POST)
  if (!parentSongId) return top

  if (top.some((p) => p.songId !== parentSongId)) return top

  const cross = bestOther.find((p) => p.songId !== parentSongId)
  if (!cross) return top

  const allThreeSame =
    top.length === SUGGESTIONS_PER_POST
    && top.every((p) => p.songId === parentSongId)

  if (allThreeSame) {
    return [...top.slice(0, SUGGESTIONS_PER_POST - 1), cross]
  }

  const already = top.some((p) =>
    p.songId === cross.songId
    && p.lineIndex === cross.lineIndex
    && p.startSec === cross.startSec
    && p.endSec === cross.endSec,
  )
  if (already) return top

  return [...top, cross].slice(0, SUGGESTIONS_PER_POST)
}

async function rankUnitsForPost(
  post: SuggestPostInput,
  units: EligibleUnit[],
): Promise<{ ok: true; picks: SuggestedLyricBack[] } | PickErr> {
  const postText = (post.text || '').trim()
  if (!postText) return { ok: true, picks: [] }

  const postTextNorm = normalizeText(postText)
  const pool = units.filter((u) => normalizeText(u.text) !== postTextNorm)
  if (pool.length === 0) return { ok: true, picks: [] }

  const byId = new Map(pool.map((u) => [u.id, u]))
  const vibe = (post.emotion || '').toUpperCase() || ''

  const chunks = chunkUnits(pool, MAX_UNITS_PER_CALL)
  let bestIds: string[] = []
  let otherIds: string[] = []

  if (chunks.length === 1) {
    const picked = await openaiPickTwoList({
      postText,
      parentSongTitle: post.songTitle,
      parentSongId: post.songId,
      units: chunks[0],
      maxBest: SUGGESTIONS_PER_POST,
    })
    if (!picked.ok) return picked
    bestIds = picked.best
    otherIds = picked.bestOtherSong
  } else {
    // Growth fallback: gather best-of-chunk, then one two-list pass on the merge pool.
    const perChunk = await mapPool(chunks, LLM_CONCURRENCY, (chunk) =>
      openaiPickTwoList({
        postText,
        parentSongTitle: post.songTitle,
        parentSongId: post.songId,
        units: chunk,
        maxBest: SUGGESTIONS_PER_POST,
      }),
    )
    if (perChunk.some((r) => !r.ok)) {
      const firstErr = perChunk.find((r): r is PickErr => !r.ok)
      return firstErr || { ok: false, reason: 'Suggestion service failed' }
    }
    const mergedPool: EligibleUnit[] = []
    const seen = new Set<string>()
    for (const row of perChunk) {
      if (!row.ok) continue
      for (const id of [...row.best, ...row.bestOtherSong]) {
        const u = byId.get(id)
        if (!u || seen.has(id)) continue
        seen.add(id)
        mergedPool.push(u)
      }
    }
    if (mergedPool.length === 0) {
      return { ok: true, picks: [] }
    }
    const merged = await openaiPickTwoList({
      postText,
      parentSongTitle: post.songTitle,
      parentSongId: post.songId,
      units: mergedPool,
      maxBest: SUGGESTIONS_PER_POST,
    })
    if (!merged.ok) return merged
    bestIds = merged.best
    otherIds = merged.bestOtherSong
  }

  const best = hydrateSuggestions(bestIds, byId, postTextNorm, vibe)
  const bestOther = hydrateSuggestions(otherIds, byId, postTextNorm, vibe, 2)
  const picks = assembleDiversifiedPicks(best, bestOther, post.songId)

  return { ok: true, picks }
}

type CacheRow = {
  post_id: string
  suggestions: SuggestedLyricBack[]
  catalog_fingerprint: string
  expires_at: string
}

async function readCache(
  supabase: SupabaseClient,
  postIds: string[],
  fingerprint: string,
): Promise<Map<string, SuggestedLyricBack[]>> {
  const hit = new Map<string, SuggestedLyricBack[]>()
  if (postIds.length === 0) return hit

  const { data, error } = await supabase
    .from('suggest_lyric_back_cache')
    .select('post_id, suggestions, catalog_fingerprint, expires_at')
    .in('post_id', postIds)
    .eq('catalog_fingerprint', fingerprint)
    .gt('expires_at', new Date().toISOString())

  if (error) {
    console.error('suggestLyricBacks: cache read failed', error)
    return hit
  }

  for (const row of (data || []) as CacheRow[]) {
    const list = Array.isArray(row.suggestions) ? row.suggestions : []
    // Never treat empty arrays as cache hits — poisoned empties from the
    // auto-batch storm must not block a fresh LLM rank.
    if (list.length === 0) continue
    hit.set(row.post_id, list.slice(0, SUGGESTIONS_PER_POST))
  }
  return hit
}

async function writeCache(
  supabase: SupabaseClient,
  postId: string,
  suggestions: SuggestedLyricBack[],
  fingerprint: string,
): Promise<void> {
  // Only cache successful non-empty picks. True "no match" and hard failures
  // both skip write so Retry / next tap can try again.
  if (suggestions.length === 0) return

  const expires = new Date(Date.now() + CACHE_TTL_MS).toISOString()
  const { error } = await supabase.from('suggest_lyric_back_cache').upsert({
    post_id: postId,
    suggestions,
    catalog_fingerprint: fingerprint,
    created_at: new Date().toISOString(),
    expires_at: expires,
  }, { onConflict: 'post_id' })

  if (error) {
    console.error('suggestLyricBacks: cache write failed', error)
  }
}

/**
 * For each post, return 0–SUGGESTIONS_PER_POST catalog lyric units chosen
 * by gpt-4o-mini as meaningful Lyric Back replies.
 * Throws {@link SuggestRankError} when the LLM path fails (so the API can 5xx
 * and the client can Retry instead of caching/showing a false empty).
 */
export async function suggestLyricBacksForPosts(
  supabase: SupabaseClient,
  posts: SuggestPostInput[],
): Promise<Record<string, SuggestedLyricBack[]>> {
  const result: Record<string, SuggestedLyricBack[]> = {}
  for (const p of posts) result[p.id] = []
  if (posts.length === 0) return result

  const units = await loadEligibleCatalogUnits(supabase)
  if (units.length === 0) return result

  const fingerprint = fingerprintUnits(units)
  const cacheHits = await readCache(
    supabase,
    posts.map((p) => p.id),
    fingerprint,
  )

  const misses: SuggestPostInput[] = []
  for (const post of posts) {
    if (cacheHits.has(post.id)) {
      result[post.id] = cacheHits.get(post.id) || []
    } else if (!(post.text || '').trim()) {
      result[post.id] = []
    } else {
      misses.push(post)
    }
  }

  if (misses.length === 0) return result

  if (!process.env.OPENAI_API_KEY) {
    throw new SuggestRankError('OpenAI is not configured')
  }

  const ranked = await mapPool(misses, LLM_CONCURRENCY, async (post) => {
    const outcome = await rankUnitsForPost(post, units)
    if (!outcome.ok) {
      return { id: post.id, ok: false as const, reason: outcome.reason }
    }
    await writeCache(supabase, post.id, outcome.picks, fingerprint)
    return { id: post.id, ok: true as const, picks: outcome.picks }
  })

  const failures = ranked.filter((r) => !r.ok)
  if (failures.length > 0) {
    // Single-post path (Feed on-demand) surfaces this to Retry.
    const reason = !failures[0].ok ? failures[0].reason : 'Suggestion failed'
    throw new SuggestRankError(reason)
  }

  for (const row of ranked) {
    if (row.ok) result[row.id] = row.picks
  }

  return result
}

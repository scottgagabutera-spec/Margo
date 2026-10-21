import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ESTIMATED_CURATION_USD,
  getDailyCurationUsdCap,
  getMaxCurationsPerSongPerDay,
  getMaxCurationsPerUserPerDay,
  isMomentsCurationEnabled,
} from '@/lib/moments/curation-config'
import type { CuratedMomentDraft, CuratedMomentStored, SongLyricLineInput } from '@/lib/moments/curated-types'
import { computeLyricsChecksum } from '@/lib/moments/lyrics-checksum'
import { validateCuratedMoments } from '@/lib/moments/validate-curated-moments'

const OPENAI_MODEL = 'gpt-4o-mini'

export type CurateSongResult =
  | { status: 'disabled' }
  | { status: 'cached'; moments: CuratedMomentStored[]; lyricsChecksum: string }
  | { status: 'curated'; moments: CuratedMomentStored[]; lyricsChecksum: string }
  | { status: 'failed'; reason: string }

type SongRow = {
  id: string
  title: string
  artist_display_name: string
  status: string
}

type LyricRow = {
  line_index: number
  text: string
  start_sec: number
  end_sec: number
}

type VibeRow = { line_index: number; vibe: string }

async function loadSongLines(
  supabase: SupabaseClient,
  songId: string,
): Promise<{ song: SongRow; lines: SongLyricLineInput[] } | null> {
  const { data: song, error: songErr } = await supabase
    .from('songs')
    .select('id, title, artist_display_name, status')
    .eq('id', songId)
    .maybeSingle()
  if (songErr || !song || song.status === 'hidden') return null

  const { data: lyricRows, error: lyricErr } = await supabase
    .from('lyric_lines')
    .select('line_index, text, start_sec, end_sec')
    .eq('song_id', songId)
    .order('line_index', { ascending: true })
  if (lyricErr || !lyricRows?.length) return null

  const { data: vibeRows } = await supabase
    .from('lyric_line_vibes')
    .select('line_index, vibe')
    .eq('song_id', songId)

  const vibesByLine = new Map<number, string[]>()
  for (const v of (vibeRows || []) as VibeRow[]) {
    const list = vibesByLine.get(v.line_index) || []
    list.push(v.vibe)
    vibesByLine.set(v.line_index, list)
  }

  const lines: SongLyricLineInput[] = (lyricRows as LyricRow[]).map((r) => ({
    lineIndex: r.line_index,
    text: r.text,
    startSec: Number(r.start_sec),
    endSec: Number(r.end_sec),
    vibes: vibesByLine.get(r.line_index) || [],
  }))

  return { song: song as SongRow, lines }
}

async function callOpenAiCurator(params: {
  title: string
  artist: string
  lines: SongLyricLineInput[]
}): Promise<CuratedMomentDraft[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI not configured')
  }

  const numbered = params.lines
    .map((l) => `[${l.lineIndex}] ${l.text.trim()} (${l.startSec.toFixed(2)}–${l.endSec.toFixed(2)}s)`)
    .join('\n')

  const vibeSample = [...new Set(params.lines.flatMap((l) => l.vibes || []))].slice(0, 12).join(', ')

  const system = `You curate shareable lyric Moments for the Margo app.

Return JSON: { "moments": [ ... ] }

Each moment:
- startLineIndex, endLineIndex (inclusive) — a CONTIGUOUS range of 2–8 lines from the numbered list
- reason: under 120 chars, why this hook works standalone
- primaryVibe: one tag (CHILL, HOPE, HEALING, GRATEFUL, SPIRITUAL, NOSTALGIA, JOY, LOVE, HYPE, PROUD, etc.)
- confidence: 0–1

Rules:
- Pick 4–8 moments when the song has enough strong material; fewer only if the song is very short.
- Each moment must be a complete thought or hook — understandable with zero context.
- Start and end at natural phrase boundaries. NEVER end mid-thought (e.g. "and then I went to").
- Skip ad-libs, filler, and throwaway interjections.
- For repeated choruses, include only the best single copy.
- Moments must not heavily overlap (different line ranges).`

  const user = `Song: ${params.title} — ${params.artist}
Existing vibes in catalog: ${vibeSample || 'none'}

Lyrics (lineIndex, text, times):
${numbered}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.35,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI curation failed: ${err.slice(0, 240)}`)
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned empty curation response')

  let parsed: { moments?: CuratedMomentDraft[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('OpenAI returned invalid JSON')
  }

  if (!Array.isArray(parsed.moments) || parsed.moments.length === 0) {
    throw new Error('OpenAI returned no moments')
  }

  return parsed.moments
}

/** Best-effort daily spend guard (serverless — not global across all instances). */
let dailySpendUsd = 0
let dailySpendDay = ''

function checkDailySpendCap(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== dailySpendDay) {
    dailySpendDay = today
    dailySpendUsd = 0
  }
  return dailySpendUsd + ESTIMATED_CURATION_USD <= getDailyCurationUsdCap()
}

function recordSpend(): void {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== dailySpendDay) {
    dailySpendDay = today
    dailySpendUsd = 0
  }
  dailySpendUsd += ESTIMATED_CURATION_USD
}

const userDailyCounts = new Map<string, { day: string; count: number }>()

function checkUserRateLimit(userId: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  const entry = userDailyCounts.get(userId)
  if (!entry || entry.day !== today) {
    userDailyCounts.set(userId, { day: today, count: 0 })
    return true
  }
  return entry.count < getMaxCurationsPerUserPerDay()
}

function recordUserCurate(userId: string): void {
  const today = new Date().toISOString().slice(0, 10)
  const entry = userDailyCounts.get(userId)
  if (!entry || entry.day !== today) {
    userDailyCounts.set(userId, { day: today, count: 1 })
    return
  }
  entry.count += 1
}

async function checkSongRateLimit(
  supabase: SupabaseClient,
  songId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('song_curated_moments')
    .select('song_id', { count: 'exact', head: true })
    .eq('song_id', songId)
    .gte('updated_at', since)
  if (error) return true
  return (count ?? 0) < getMaxCurationsPerSongPerDay()
}

export async function curateSongMoments(params: {
  supabaseAdmin: SupabaseClient
  songId: string
  userId?: string | null
  force?: boolean
  writeCache?: boolean
}): Promise<CurateSongResult> {
  if (!isMomentsCurationEnabled()) {
    return { status: 'disabled' }
  }

  const loaded = await loadSongLines(params.supabaseAdmin, params.songId)
  if (!loaded) {
    return { status: 'failed', reason: 'Song or lyrics not found' }
  }

  const { song, lines } = loaded
  const lyricsChecksum = computeLyricsChecksum(
    lines.map((l) => ({
      lineIndex: l.lineIndex,
      text: l.text,
      startSec: l.startSec,
      endSec: l.endSec,
    })),
  )

  const { data: cached } = await params.supabaseAdmin
    .from('song_curated_moments')
    .select('lyrics_checksum, moments')
    .eq('song_id', params.songId)
    .maybeSingle()

  if (
    !params.force &&
    cached?.lyrics_checksum === lyricsChecksum &&
    Array.isArray(cached.moments) &&
    cached.moments.length > 0
  ) {
    return {
      status: 'cached',
      moments: cached.moments as CuratedMomentStored[],
      lyricsChecksum,
    }
  }

  if (params.userId) {
    if (!checkUserRateLimit(params.userId)) {
      return { status: 'failed', reason: 'User curation rate limit' }
    }
  }

  if (!checkDailySpendCap()) {
    return { status: 'failed', reason: 'Daily curation spend cap' }
  }

  if (!(await checkSongRateLimit(params.supabaseAdmin, params.songId))) {
    return { status: 'failed', reason: 'Song curation rate limit' }
  }

  let drafts: CuratedMomentDraft[]
  try {
    drafts = await callOpenAiCurator({
      title: song.title,
      artist: song.artist_display_name,
      lines,
    })
    recordSpend()
    if (params.userId) recordUserCurate(params.userId)
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'OpenAI failed'
    return { status: 'failed', reason }
  }

  const validated = validateCuratedMoments(drafts, lines, { minMoments: 1, maxMoments: 8 })
  if (!validated.ok) {
    return { status: 'failed', reason: validated.reason }
  }

  if (params.writeCache !== false) {
    const { error: upsertErr } = await params.supabaseAdmin
      .from('song_curated_moments')
      .upsert({
        song_id: params.songId,
        lyrics_checksum: lyricsChecksum,
        moments: validated.moments,
        model: OPENAI_MODEL,
      })
    if (upsertErr) {
      console.error('curateSongMoments: cache upsert failed', upsertErr)
      return { status: 'failed', reason: 'Cache write failed' }
    }
  }

  return {
    status: 'curated',
    moments: validated.moments,
    lyricsChecksum,
  }
}

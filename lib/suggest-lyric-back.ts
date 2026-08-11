/**
 * Catalog-only Suggested Lyric Back retrieval (v1).
 * Matches posts.emotion → lyric_line_vibes; expands short lines via
 * buildCatalogLyricUnits. No LLM.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCatalogLyricUnits,
  type CatalogLyricAtom,
} from '@/lib/catalog-lyric-unit'

/** Vibes that Studio tags onto lyric_lines today (tag-vibes). */
export const SUGGEST_VIBES = [
  'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL',
  'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD',
] as const

export type SuggestVibe = (typeof SUGGEST_VIBES)[number]

export const SHORT_LINE_WORDS = 3
export const MIN_SUGGEST_UNIT_WORDS = 4
export const SUGGESTIONS_PER_POST = 3
export const SUGGEST_BATCH_MAX = 25

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
  vibe: string
}

export type SuggestPostInput = {
  id: string
  emotion?: string | null
  text?: string | null
  songId?: string | null
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function normalizeSuggestVibe(raw: string | null | undefined): SuggestVibe | null {
  if (!raw) return null
  const key = raw
    .replace(/send.?it/i, 'SENDIT')
    .replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT')
    .replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT')
    .replace('LET OUT', 'LETOUT')
    .trim()
    .toUpperCase()
  return (SUGGEST_VIBES as readonly string[]).includes(key) ? (key as SuggestVibe) : null
}

function normalizeText(s: string): string {
  return (s || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'\u2018\u2019\u201c\u201d]/g, '')
    .replace(/\s+/g, ' ')
}

type CandidateRow = {
  id: string
  song_id: string
  line_index: number
  text: string
  start_sec: number
  end_sec: number
  vibe: string
  songTitle: string
  artistName: string
  artworkUrl: string | null
  audioUrl: string | null
}

function pickUnit(
  atoms: CatalogLyricAtom[],
  centerLineIndex: number,
): { text: string; startSec: number; endSec: number; lineIndex: number; vibes: string[] } | null {
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
    vibes: unit.vibes,
  }
}

/**
 * For each post, return up to SUGGESTIONS_PER_POST catalog lyric units
 * whose vibes overlap the post emotion.
 */
export async function suggestLyricBacksForPosts(
  supabase: SupabaseClient,
  posts: SuggestPostInput[],
): Promise<Record<string, SuggestedLyricBack[]>> {
  const result: Record<string, SuggestedLyricBack[]> = {}
  for (const p of posts) result[p.id] = []

  const actionable = posts
    .map((p) => ({ post: p, vibe: normalizeSuggestVibe(p.emotion) }))
    .filter((x): x is { post: SuggestPostInput; vibe: SuggestVibe } => Boolean(x.vibe))

  if (actionable.length === 0) return result

  const neededVibes = [...new Set(actionable.map((a) => a.vibe))]

  const { data: vibeRows, error: vibeErr } = await supabase
    .from('lyric_line_vibes')
    .select(`
      vibe,
      lyric_lines!inner (
        id,
        song_id,
        line_index,
        text,
        start_sec,
        end_sec,
        songs!inner (
          id,
          title,
          artist_display_name,
          artwork_url,
          audio_url,
          status
        )
      )
    `)
    .in('vibe', neededVibes)

  if (vibeErr) {
    console.error('suggestLyricBacksForPosts: vibe query failed', vibeErr)
    return result
  }

  const candidates: CandidateRow[] = []
  const songIds = new Set<string>()

  for (const row of vibeRows || []) {
    const line = Array.isArray(row.lyric_lines) ? row.lyric_lines[0] : row.lyric_lines
    if (!line) continue
    const song = Array.isArray(line.songs) ? line.songs[0] : line.songs
    if (!song || song.status !== 'live') continue
    songIds.add(song.id)
    candidates.push({
      id: line.id,
      song_id: song.id,
      line_index: line.line_index,
      text: line.text,
      start_sec: Number(line.start_sec),
      end_sec: Number(line.end_sec),
      vibe: row.vibe,
      songTitle: song.title,
      artistName: song.artist_display_name,
      artworkUrl: song.artwork_url ?? null,
      audioUrl: song.audio_url ?? null,
    })
  }

  if (candidates.length === 0) return result

  const { data: atomRows, error: atomErr } = await supabase
    .from('lyric_lines')
    .select('song_id, line_index, text, start_sec, end_sec')
    .in('song_id', [...songIds])

  if (atomErr) {
    console.error('suggestLyricBacksForPosts: atoms query failed', atomErr)
    return result
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

  // Attach vibes onto atoms for union when windowing.
  const vibeBySongLine = new Map<string, string[]>()
  for (const c of candidates) {
    const key = `${c.song_id}_${c.line_index}`
    const list = vibeBySongLine.get(key) || []
    if (!list.includes(c.vibe)) list.push(c.vibe)
    vibeBySongLine.set(key, list)
  }
  for (const [songId, list] of atomsBySong) {
    for (const atom of list) {
      atom.vibes = vibeBySongLine.get(`${songId}_${atom.lineIndex}`) || []
    }
  }

  const byVibe = new Map<string, CandidateRow[]>()
  for (const c of candidates) {
    const list = byVibe.get(c.vibe) || []
    list.push(c)
    byVibe.set(c.vibe, list)
  }

  for (const { post, vibe } of actionable) {
    const pool = byVibe.get(vibe) || []
    const postTextNorm = normalizeText(post.text || '')
    const scored: { score: number; suggestion: SuggestedLyricBack; rangeKey: string }[] = []
    const seenRanges = new Set<string>()

    for (const c of pool) {
      if (postTextNorm && normalizeText(c.text) === postTextNorm) continue
      const atoms = atomsBySong.get(c.song_id)
      if (!atoms?.length) continue
      const unit = pickUnit(atoms, c.line_index)
      if (!unit) continue

      const rangeKey = `${c.song_id}_${unit.startSec}_${unit.endSec}`
      if (seenRanges.has(rangeKey)) continue
      seenRanges.add(rangeKey)

      let score = 0
      if (post.songId && c.song_id !== post.songId) score += 3
      else if (!post.songId) score += 1
      if (unit.vibes.includes(vibe)) score += 1
      // Prefer longer units slightly (more “replyable”).
      score += Math.min(2, Math.floor(wordCount(unit.text) / 6))

      scored.push({
        score,
        rangeKey,
        suggestion: {
          text: unit.text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
          songTitle: c.songTitle,
          artistName: c.artistName,
          songId: c.song_id,
          lineIndex: unit.lineIndex,
          startSec: unit.startSec,
          endSec: unit.endSec,
          audioUrl: c.audioUrl,
          artworkUrl: c.artworkUrl,
          vibe,
        },
      })
    }

    // Soft diversify: prefer distinct songs in top 3.
    scored.sort((a, b) => b.score - a.score)
    const picked: SuggestedLyricBack[] = []
    const usedSongs = new Set<string>()
    for (const row of scored) {
      if (picked.length >= SUGGESTIONS_PER_POST) break
      if (usedSongs.has(row.suggestion.songId) && picked.length < SUGGESTIONS_PER_POST) {
        // Skip same-song until we need fillers
        continue
      }
      picked.push(row.suggestion)
      usedSongs.add(row.suggestion.songId)
    }
    if (picked.length < SUGGESTIONS_PER_POST) {
      for (const row of scored) {
        if (picked.length >= SUGGESTIONS_PER_POST) break
        if (picked.some((p) => p.songId === row.suggestion.songId && p.lineIndex === row.suggestion.lineIndex)) {
          continue
        }
        if (picked.some((p) =>
          p.songId === row.suggestion.songId
          && p.startSec === row.suggestion.startSec
          && p.endSec === row.suggestion.endSec
        )) continue
        picked.push(row.suggestion)
      }
    }

    result[post.id] = picked.slice(0, SUGGESTIONS_PER_POST)
  }

  return result
}

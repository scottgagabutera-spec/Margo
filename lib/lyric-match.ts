import type { SupabaseClient } from '@supabase/supabase-js'

// ── Added Aug 2, 2026 ───────────────────────────────────────────────────
// Single source of truth for "which real lyric_lines row does this typed
// text correspond to." Used in two places: once when a post is created
// (compose, lyric-back), and again whenever someone edits their post's
// text — both call this and overwrite the post's snippet_start_sec/
// snippet_end_sec with the result, rather than the feed re-guessing a
// match on every render.
//
// Why not simple substring containment (the old feed behavior)? Because
// that's exactly what caused the reported bug: a typed lyric that isn't
// a character-for-character substring of the real SRT line (extra/
// missing punctuation, a slightly different word, the 140-char compose
// cap cutting the line differently) would match nothing, and the old
// code silently fell back to lyrics[0] — starting the whole song instead
// of failing loudly. This uses normalized edit-distance similarity
// instead, with a confidence threshold, and returns null (no snippet)
// rather than guessing wrong when nothing is confident.

export interface LyricMatch {
  lineId: number
  startSec: number
  endSec: number
  confidence: number
}

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'\u2018\u2019\u201c\u201d]/g, '')
    .replace(/\s+/g, ' ')
}

// Standard iterative Levenshtein distance. Lyric lines are short (well
// under 200 chars), so the O(n*m) cost here is trivial per comparison —
// this runs against maybe a few hundred lines for one song, once, not on
// every render.
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const curr = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      )
    }
    prev = curr
  }
  return prev[n]
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1

  // One fully containing the other is a strong signal even before edit-
  // distance — handles the common case of a truncated (140-char cap) or
  // slightly expanded quote of the real line.
  const containmentBoost = na.includes(nb) || nb.includes(na) ? 0.25 : 0

  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  const editSimilarity = 1 - dist / maxLen

  return Math.min(1, editSimilarity + containmentBoost)
}

// Below this confidence, we return null rather than guess — a missing
// snippet button is a much smaller problem than the wrong one starting
// the whole song from the top.
const CONFIDENCE_THRESHOLD = 0.55

export async function matchLyricLine(
  supabase: SupabaseClient,
  songId: string,
  text: string
): Promise<LyricMatch | null> {
  if (!songId || !text?.trim()) return null

  const { data, error } = await supabase
    .from('lyric_lines')
    .select('line_index, text, start_sec, end_sec')
    .eq('song_id', songId)

  if (error || !data || data.length === 0) return null

  let best: LyricMatch | null = null
  for (const line of data) {
    const score = similarity(text, line.text)
    if (!best || score > best.confidence) {
      best = {
        lineId: line.line_index,
        startSec: line.start_sec,
        endSec: line.end_sec,
        confidence: score,
      }
    }
  }

  if (!best || best.confidence < CONFIDENCE_THRESHOLD) return null
  return best
}
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

export interface LyricLineWindow {
  lineId: number
  lineText: string
  startSec: number
  endSec: number
}

export interface MatchableLyricLine {
  id?: number
  line_index?: number
  lineId?: number
  line?: string
  text?: string
  start?: number
  start_sec?: number
  end?: number
  end_sec?: number
}

/** When playback cannot resolve a line, play this many seconds from the top. */
export const FALLBACK_SNIPPET_SEC = 8

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'\u2018\u2019\u201c\u201d]/g, '')
    .replace(/\s+/g, ' ')
}

/** Single-word needles must not win over a longer quoted line (Nawala bug). */
export function isSubstantialPhrase(text: string): boolean {
  const n = normalize(text)
  const words = n.split(/\s+/).filter(Boolean)
  return words.length >= 2 || n.length >= 12
}

function lineIdOf(line: MatchableLyricLine): number {
  return line.id ?? line.line_index ?? line.lineId ?? 0
}

function lineTextOf(line: MatchableLyricLine): string {
  return line.line ?? line.text ?? ''
}

function startSecOf(line: MatchableLyricLine): number {
  return line.start ?? line.start_sec ?? 0
}

function endSecOf(line: MatchableLyricLine): number {
  return line.end ?? line.end_sec ?? 0
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

  // Containment boost only when the contained side is substantial — stops
  // one-word lines like "Everything" from winning inside a longer quote.
  let containmentBoost = 0
  if (na.includes(nb) && isSubstantialPhrase(b)) {
    containmentBoost = 0.25
  } else if (nb.includes(na) && isSubstantialPhrase(a)) {
    containmentBoost = 0.25
  }

  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  const editSimilarity = 1 - dist / maxLen

  return Math.min(1, editSimilarity + containmentBoost)
}

export function fallbackSnippetWindow(): { startSec: number; endSec: number } {
  return { startSec: 0, endSec: FALLBACK_SNIPPET_SEC }
}

/**
 * Strict play-time matcher: exact → line-contains-quote → quote-contains-
 * substantial-line. Returns null when nothing is confident — callers should
 * fall back to {@link fallbackSnippetWindow} instead of silently no-oping.
 */
export function matchLyricWindowFromLines(
  lines: MatchableLyricLine[],
  quoteText: string,
): LyricLineWindow | null {
  if (!lines?.length || !quoteText?.trim()) return null

  const needle = normalize(quoteText)

  for (const line of lines) {
    const text = lineTextOf(line)
    if (normalize(text) === needle) {
      return {
        lineId: lineIdOf(line),
        lineText: text,
        startSec: startSecOf(line),
        endSec: endSecOf(line),
      }
    }
  }

  let bestContains: MatchableLyricLine | null = null
  let bestContainsLen = 0
  for (const line of lines) {
    const text = lineTextOf(line)
    const nl = normalize(text)
    if (nl.includes(needle) && nl.length > bestContainsLen) {
      bestContains = line
      bestContainsLen = nl.length
    }
  }
  if (bestContains) {
    return {
      lineId: lineIdOf(bestContains),
      lineText: lineTextOf(bestContains),
      startSec: startSecOf(bestContains),
      endSec: endSecOf(bestContains),
    }
  }

  let bestSubstantial: MatchableLyricLine | null = null
  let bestSubstantialLen = 0
  for (const line of lines) {
    const text = lineTextOf(line)
    const nl = normalize(text)
    if (needle.includes(nl) && isSubstantialPhrase(text) && nl.length > bestSubstantialLen) {
      bestSubstantial = line
      bestSubstantialLen = nl.length
    }
  }
  if (bestSubstantial) {
    return {
      lineId: lineIdOf(bestSubstantial),
      lineText: lineTextOf(bestSubstantial),
      startSec: startSecOf(bestSubstantial),
      endSec: endSecOf(bestSubstantial),
    }
  }

  return null
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

  const strict = matchLyricWindowFromLines(
    data.map(l => ({
      line_index: l.line_index,
      text: l.text,
      start_sec: l.start_sec,
      end_sec: l.end_sec,
    })),
    text,
  )
  if (strict) {
    return {
      lineId: strict.lineId,
      startSec: strict.startSec,
      endSec: strict.endSec,
      confidence: 1,
    }
  }

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

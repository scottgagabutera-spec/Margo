/**
 * Margo AudioEngine — SRT snippet resolver
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.6
 *
 * Resolves a lineIndex from a song's SRT data into startSec/endSec
 * bounds for the engine. The engine never does fuzzy post-text
 * matching — call sites resolve the line before calling playSnippet().
 *
 * SRT format used in Margo:
 *   { index: number, start: number, end: number, line: string }[]
 * (same shape as useSong / songs/{id}.srt parsed output)
 */

// ── SRT line shape (matches useSong output) ───────────────────────
export interface SrtLine {
  index: number
  start: number  // seconds
  end: number    // seconds
  line: string
}

// ── Resolution result ─────────────────────────────────────────────
export interface ResolvedSnippet {
  lineIndex: number
  lineText: string
  startSec: number
  endSec: number
}

// ── Constants ─────────────────────────────────────────────────────
/** Minimum snippet duration in seconds — avoids zero-length windows */
const MIN_SNIPPET_SEC = 2

/**
 * Resolve a lineIndex to snippet bounds from a parsed SRT array.
 * Returns null if lines is empty or lineIndex is out of range.
 *
 * endSec is clamped to the next line's start when lines are
 * adjacent, preserving natural phrasing without overlap.
 */
export function resolveSnippetFromLines(
  lines: SrtLine[],
  lineIndex: number,
): ResolvedSnippet | null {
  if (!lines || lines.length === 0) return null

  const safeIndex = Math.max(0, Math.min(lineIndex, lines.length - 1))
  const line = lines[safeIndex]
  if (!line) return null

  const startSec = line.start
  let endSec = line.end

  // Clamp to minimum duration
  if (endSec - startSec < MIN_SNIPPET_SEC) {
    endSec = startSec + MIN_SNIPPET_SEC
  }

  return {
    lineIndex: safeIndex,
    lineText: line.line,
    startSec,
    endSec,
  }
}

/**
 * Find the best matching lineIndex for a lyric text string.
 * Used at post-create time to store lineIndex on the post,
 * NOT at play time (engine never fuzzy-matches).
 *
 * Returns the index of the closest match or 0 if no match found.
 */
export function findLineIndexForText(
  lines: SrtLine[],
  text: string,
): number {
  if (!lines || lines.length === 0 || !text) return 0

  const normalised = text.trim().toLowerCase()

  // Exact match first
  const exact = lines.findIndex(
    l => l.line.trim().toLowerCase() === normalised,
  )
  if (exact !== -1) return exact

  // Substring match — find line that contains the most words from text
  let bestIndex = 0
  let bestScore = 0
  const words = normalised.split(/\s+/).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const lineWords = lines[i].line.trim().toLowerCase().split(/\s+/)
    const score = words.filter(w => lineWords.includes(w)).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}

/**
 * Resolve the current playback line index from currentTime.
 * Used by karaoke page to highlight the active lyric.
 * Returns -1 when currentTime is before the first line.
 */
export function resolveCurrentLineIndex(
  lines: SrtLine[],
  currentTime: number,
): number {
  if (!lines || lines.length === 0) return -1

  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTime >= lines[i].start) {
      return i
    }
  }

  return -1
}

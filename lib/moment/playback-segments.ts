import type { PostLine } from '@/lib/post-lines'

/** Max silence between line ends and the next line start to still merge (adjacent group). */
export const GAP_MAX_SEC = 1.5

/** Crossfade between non-adjacent post-moment segments on the same track. */
export const POST_MOMENT_CROSSFADE_MS = 350

export type PlaybackSegment = {
  startSec: number
  endSec: number
}

export type PlaybackSegmentLineInput = Pick<
  PostLine,
  'position' | 'songId' | 'snippetStart' | 'snippetEnd'
>

function isValidInterval(start: number, end: number): boolean {
  return Number.isFinite(start) && Number.isFinite(end) && end > start
}

/**
 * Build ordered playback segments for a post's Margo catalog lines.
 * - Preserves post line order (position).
 * - Merges overlapping intervals and gaps in [0, GAP_MAX_SEC] into one continuous segment.
 * - Gaps strictly greater than GAP_MAX_SEC start a new segment (engine crossfades between them).
 * - Multiple songs: keeps first song only (console warning).
 */
export function computePlaybackSegments(lines: PlaybackSegmentLineInput[]): PlaybackSegment[] {
  const ordered = [...lines].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const playable = ordered.filter((line) => {
    if (!line.songId) return false
    const start = line.snippetStart
    const end = line.snippetEnd
    if (start == null || end == null) return false
    return isValidInterval(start, end)
  })

  if (playable.length === 0) return []

  const primarySongId = playable[0].songId
  const mixedSong = playable.some((l) => l.songId !== primarySongId)
  if (mixedSong) {
    console.warn(
      '[computePlaybackSegments] post lines reference multiple songs; using segments for the first song only',
    )
  }

  const sameSong = playable.filter((l) => l.songId === primarySongId)
  const segments: PlaybackSegment[] = []

  for (const line of sameSong) {
    const startSec = line.snippetStart as number
    const endSec = line.snippetEnd as number
    if (!isValidInterval(startSec, endSec)) continue

    if (segments.length === 0) {
      segments.push({ startSec, endSec })
      continue
    }

    const last = segments[segments.length - 1]
    const gap = startSec - last.endSec

    if (gap > GAP_MAX_SEC) {
      segments.push({ startSec, endSec })
      continue
    }

    last.startSec = Math.min(last.startSec, startSec)
    last.endSec = Math.max(last.endSec, endSec)
  }

  return dedupeSegments(segments)
}

function dedupeSegments(segments: PlaybackSegment[]): PlaybackSegment[] {
  const out: PlaybackSegment[] = []
  for (const seg of segments) {
    const prev = out[out.length - 1]
    if (
      prev &&
      Math.abs(prev.startSec - seg.startSec) < 0.001 &&
      Math.abs(prev.endSec - seg.endSec) < 0.001
    ) {
      continue
    }
    out.push({ ...seg })
  }
  return out
}

export function postLinesToSegmentInput(lines: PostLine[]): PlaybackSegmentLineInput[] {
  return lines.map((line) => ({
    position: line.position,
    songId: line.songId,
    snippetStart: line.snippetStart,
    snippetEnd: line.snippetEnd,
  }))
}

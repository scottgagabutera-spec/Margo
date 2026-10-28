import type { ComposeLyricLine } from '@/components/compose-line-picker'
import { computePlaybackSegments } from '@/lib/moment/playback-segments'

export function catalogLinesToPlaybackSegments(
  songId: string | null,
  lines: ComposeLyricLine[],
) {
  if (!songId || lines.length === 0) return []
  return computePlaybackSegments(
    lines.map((line, position) => ({
      position,
      songId,
      snippetStart: line.startSec,
      snippetEnd: line.endSec,
    })),
  )
}

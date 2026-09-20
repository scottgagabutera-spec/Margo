import type { MargoMoment } from '@/lib/moment/types'
import { resolveQueueVisualPrefs, type PromoteQueueRow } from '@/lib/promote/types'

/** Build a renderable MargoMoment from a queue row + optional loaded line audio fields. */
export function buildPromoteQueueMoment(
  row: PromoteQueueRow,
  audio?: {
    audioUrl?: string | null
    snippetStart?: number | null
    snippetEnd?: number | null
  },
): MargoMoment {
  const prefs = resolveQueueVisualPrefs(row)
  return {
    lines: [{
      lyric: row.lyricText,
      songTitle: row.songTitle,
      artistName: row.artistName,
      artworkUrl: row.artworkUrl,
      audioUrl: audio?.audioUrl ?? null,
      snippetStart: audio?.snippetStart ?? null,
      snippetEnd: audio?.snippetEnd ?? null,
    }],
    themeId: prefs.exportThemeId,
    shapeId: prefs.exportShapeId,
    exportAtmosphereId: prefs.exportAtmosphereId,
    postId: row.sourcePostId,
    seedKey: `promote:${row.id}`,
  }
}

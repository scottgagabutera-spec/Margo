import type { MargoMoment } from '@/lib/moment/types'
import { emotionToVibeLabel } from '@/lib/moment/vibe'
import { resolveQueueVisualPrefs, type PromoteQueueRow } from '@/lib/promote/types'

/** Build a renderable MargoMoment from a queue row + optional loaded line audio fields. */
export function buildPromoteQueueMoment(
  row: PromoteQueueRow,
  audio?: {
    songId?: string | null
    audioUrl?: string | null
    snippetStart?: number | null
    snippetEnd?: number | null
  },
): MargoMoment {
  const prefs = resolveQueueVisualPrefs(row)
  const moodRaw = row.selectionReason?.mood ?? row.selectionReason?.modelMood
  const vibeLabel = typeof moodRaw === 'string'
    ? emotionToVibeLabel(moodRaw)
    : null

  return {
    lines: [{
      lyric: row.lyricText,
      songTitle: row.songTitle,
      artistName: row.artistName,
      artworkUrl: row.artworkUrl,
      songId: audio?.songId ?? row.sourceSongId ?? null,
      audioUrl: audio?.audioUrl ?? null,
      snippetStart: audio?.snippetStart ?? row.snippetStartSec ?? null,
      snippetEnd: audio?.snippetEnd ?? row.snippetEndSec ?? null,
    }],
    vibeLabel,
    emotion: typeof moodRaw === 'string' ? moodRaw.toLowerCase() : null,
    themeId: prefs.exportThemeId,
    shapeId: prefs.exportShapeId,
    exportAtmosphereId: prefs.exportAtmosphereId,
    postId: row.sourcePostId,
    seedKey: `promote:${row.id}`,
  }
}

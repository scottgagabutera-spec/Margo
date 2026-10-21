import type { CuratedMomentStored } from '@/lib/moments/curated-types'
import type { LyricMoment } from '@/lib/lyric-moments-board'
import type { AtmosphereId } from '@/lib/atmosphere'

export type CuratedSongMeta = {
  songTitle: string
  artist: string
  artwork?: string | null
  audioUrl?: string | null
  atmosphere?: AtmosphereId
}

/** Map stored curated moments to Discover LyricMoment rows (gap-trimmed via stored start/end). */
export function lyricMomentsFromCurated(
  songId: string,
  meta: CuratedSongMeta,
  moments: CuratedMomentStored[],
): LyricMoment[] {
  return moments.map((m) => ({
    line: m.text,
    start: m.startSec,
    end: m.endSec,
    lineId: m.startLineIndex,
    songId,
    songTitle: meta.songTitle,
    artist: meta.artist,
    artwork: meta.artwork,
    audioUrl: meta.audioUrl,
    vibes: [m.primaryVibe],
    atmosphere: meta.atmosphere,
  }))
}

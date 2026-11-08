import type { LyricMoment } from '@/lib/lyric-moments-board'
import { pickShortsLook } from '@/lib/shorts-looks'
import { utcDayKey } from '@/lib/shorts-shelf-rotation'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import type { FeedShortsStripTile } from '@/lib/feed-shorts-strip-types'

export function feedShortsStripTilesFromClips(clips: LyricMoment[], max = 3): FeedShortsStripTile[] {
  const day = utcDayKey(new Date())
  return clips.slice(0, max).map((clip, stripIndex) => {
    const vibe = (clip.vibes[0] || 'CHILL').toUpperCase()
    const look = pickShortsLook(clip.songId, vibe, day)
    const thumb = clip.artwork?.trim() ? compactArtworkUrl(clip.artwork, 120) : null
    return {
      songId: clip.songId,
      lineId: clip.lineId,
      line: clip.line,
      songTitle: clip.songTitle,
      vibe,
      lookId: look.id,
      artworkThumb: thumb,
      stripIndex,
    }
  })
}

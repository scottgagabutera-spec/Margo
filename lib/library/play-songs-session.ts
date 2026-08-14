import {
  fullSongToQueueItem,
  playQueueIndex,
  setQueue,
} from '@/lib/audio-engine'
import type { SongCardData } from '@/components/song-catalog-card'

export function playSongsAsSession(songs: SongCardData[], startIndex = 0): void {
  const queue = songs
    .filter(s => s.audioUrl && (s.status === 'live' || s.status === 'active' || !s.status))
    .map(s => fullSongToQueueItem({
      id: s.id,
      audioUrl: s.audioUrl!,
      title: s.title,
      artist: s.artist,
      artwork: s.artwork ?? null,
    }))
  if (queue.length === 0) return
  const safe = Math.max(0, Math.min(startIndex, queue.length - 1))
  setQueue(queue, safe)
  playQueueIndex(safe)
}

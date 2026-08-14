import {
  playSnippet as enginePlaySnippet,
  queueAdd,
  queuePlayNext,
  setQueue,
  snippetToQueueItem,
} from '@/lib/audio-engine'
import type { LyricMoment } from '@/lib/lyric-moments-board'

export function playLyricMomentPool(
  moment: LyricMoment,
  pool: LyricMoment[],
): void {
  if (!moment.audioUrl) return
  const queueItems = pool.filter(m => m.audioUrl).map(m => ({
    kind: 'snippet' as const,
    songId: m.songId,
    audioUrl: m.audioUrl!,
    title: m.songTitle,
    artist: m.artist,
    artwork: m.artwork ?? null,
    lineIndex: m.lineId,
    lineText: m.line,
    startSec: m.start,
    endSec: m.end,
    vibe: (m.vibes && m.vibes[0]) || null,
  }))
  const idx = queueItems.findIndex(q => q.songId === moment.songId && q.lineIndex === moment.lineId)
  setQueue(queueItems, idx >= 0 ? idx : 0)
  void enginePlaySnippet({
    songId: moment.songId,
    audioUrl: moment.audioUrl,
    title: moment.songTitle,
    artist: moment.artist,
    artwork: moment.artwork ?? null,
    lineIndex: moment.lineId,
    lineText: moment.line,
    startSec: moment.start,
    endSec: moment.end,
    vibe: (moment.vibes && moment.vibes[0]) || null,
    source: 'music-board',
  })
}

export function queueLyricMoment(moment: LyricMoment, mode: 'next' | 'add'): void {
  if (!moment.audioUrl) return
  const item = snippetToQueueItem({
    songId: moment.songId,
    audioUrl: moment.audioUrl,
    title: moment.songTitle,
    artist: moment.artist,
    artwork: moment.artwork ?? null,
    lineIndex: moment.lineId,
    lineText: moment.line,
    startSec: moment.start,
    endSec: moment.end,
    vibe: (moment.vibes && moment.vibes[0]) || null,
  })
  if (mode === 'next') queuePlayNext(item)
  else queueAdd(item)
}

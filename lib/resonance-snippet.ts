import type { Post } from '@/hooks/usePosts'
import type { Song } from '@/hooks/useSongs'
import {
  playSnippet as enginePlaySnippet,
  queueAdd,
  queuePlayNext,
  snippetToQueueItem,
} from '@/lib/audio-engine'

export function matchLineInSong(song: Song | undefined, text: string | undefined) {
  if (!song || !text) return null
  const needle = text.toLowerCase().trim()
  const match = song.lyricLines?.find(l =>
    l.text.toLowerCase().includes(needle) || needle.includes(l.text.toLowerCase())
  )
  return match || null
}

export function resolveResonanceWindow(
  post: Post,
  song: Song | undefined,
): { startSec: number; endSec: number } {
  let startSec = post.snippetStart
  let endSec = post.snippetEnd
  if (startSec == null || endSec == null) {
    const matched = matchLineInSong(song, post.text)
    startSec = matched ? matched.startSec : 0
    endSec = matched ? matched.endSec : 5
  }
  return { startSec, endSec }
}

export function playResonancePost(post: Post, song: Song | undefined): void {
  if (!post.audioUrl || !post.songId) return
  const { startSec, endSec } = resolveResonanceWindow(post, song)
  void enginePlaySnippet({
    songId: post.songId,
    audioUrl: post.audioUrl,
    title: post.knowledge?.song || song?.title || '',
    artist: post.knowledge?.artist || song?.artist || '',
    artwork: post.knowledge?.artwork ?? song?.artwork ?? null,
    lineIndex: 0,
    lineText: post.text || '',
    startSec,
    endSec,
    vibe: null,
    source: 'music-resonance-row',
  })
}

export function queueResonancePost(
  post: Post,
  song: Song | undefined,
  mode: 'next' | 'add',
): void {
  if (!post.audioUrl || !post.songId) return
  const { startSec, endSec } = resolveResonanceWindow(post, song)
  const item = snippetToQueueItem({
    songId: post.songId,
    audioUrl: post.audioUrl,
    title: post.knowledge?.song || song?.title || '',
    artist: post.knowledge?.artist || song?.artist || '',
    artwork: post.knowledge?.artwork ?? song?.artwork ?? null,
    lineIndex: 0,
    lineText: post.text || '',
    startSec,
    endSec,
    vibe: null,
  })
  if (mode === 'next') queuePlayNext(item)
  else queueAdd(item)
}

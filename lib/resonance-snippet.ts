import type { Post } from '@/hooks/usePosts'
import type { Song } from '@/hooks/useSongs'
import {
  playSnippet as enginePlaySnippet,
  queueAdd,
  queuePlayNext,
  snippetToQueueItem,
} from '@/lib/audio-engine'
import {
  fallbackSnippetWindow,
  matchLyricWindowFromLines,
} from '@/lib/lyric-match'

export function matchLineInSong(song: Song | undefined, text: string | undefined) {
  if (!song || !text) return null
  const lines = song.lyricLines?.map(l => ({
    id: l.lineIndex,
    line: l.text,
    start: l.startSec,
    end: l.endSec,
  })) ?? []
  const match = matchLyricWindowFromLines(lines, text)
  if (!match) return null
  return {
    lineIndex: match.lineId,
    text: match.lineText,
    startSec: match.startSec,
    endSec: match.endSec,
  }
}

export function resolveResonanceWindow(
  post: Post,
  song: Song | undefined,
): { startSec: number; endSec: number } {
  let startSec = post.snippetStart
  let endSec = post.snippetEnd
  if (startSec == null || endSec == null) {
    const matched = matchLineInSong(song, post.text)
    if (matched) {
      startSec = matched.startSec
      endSec = matched.endSec
    } else {
      const fb = fallbackSnippetWindow()
      startSec = fb.startSec
      endSec = fb.endSec
    }
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

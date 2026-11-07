import type { MemoryPublic } from '@/lib/memory/types'
import { memoryDefaultTitle } from './title'

const STORY_PREVIEW_WORDS = 14

function firstWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}…`
}

/** User-facing label for compact memory surfaces (tiles, grid, feed card). */
export function memoryDisplayCaption(memory: MemoryPublic): string {
  const rawTitle = (memory.title || '').trim()
  const isPlaceholderTitle =
    !rawTitle || rawTitle === memoryDefaultTitle(memory.songCount)

  if (!isPlaceholderTitle) return rawTitle

  const story = (memory.story || '').trim()
  if (story) return firstWords(story, STORY_PREVIEW_WORDS)

  const firstSong = memory.songs[0]
  if (firstSong?.songTitle?.trim()) return firstSong.songTitle.trim()
  if (firstSong?.artistName?.trim()) return firstSong.artistName.trim()

  return rawTitle || 'Memory'
}

/** Cover is song artwork only (no user-uploaded photos on the memory). */
export function memoryCoverIsSongArt(memory: MemoryPublic): boolean {
  return (memory.photos?.length ?? 0) < 1
}

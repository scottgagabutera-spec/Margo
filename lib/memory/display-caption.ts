import type { MemoryPublic } from '@/lib/memory/types'
import { memoryDefaultTitle } from './title'

export function memoryTitleIsPlaceholder(memory: MemoryPublic): boolean {
  const rawTitle = (memory.title || '').trim()
  return !rawTitle || rawTitle === memoryDefaultTitle(memory.songCount)
}

/** Display title — memory title, else full story, else first song title. */
export function memoryCaptionTitle(memory: MemoryPublic): string {
  const rawTitle = (memory.title || '').trim()
  if (!memoryTitleIsPlaceholder(memory)) return rawTitle

  const story = (memory.story || '').trim()
  if (story) return story

  const firstSong = memory.songs[0]
  if (firstSong?.songTitle?.trim()) return firstSong.songTitle.trim()

  return rawTitle || 'Memory'
}

/** Secondary line: artists on the memory (compact). */
export function memoryCaptionArtists(memory: MemoryPublic): string {
  const names = [...new Set(memory.songs.map((s) => s.artistName).filter(Boolean))]
  return names.slice(0, 3).join(', ')
}

/** User-facing aria / compact string. */
export function memoryDisplayCaption(memory: MemoryPublic): string {
  const artists = memoryCaptionArtists(memory)
  const title = memoryCaptionTitle(memory)
  return artists ? `${title} · ${artists}` : title
}

/** Cover is song artwork only (no user-uploaded photos on the memory). */
export function memoryCoverIsSongArt(memory: MemoryPublic): boolean {
  return (memory.photos?.length ?? 0) < 1
}

/** Typographic tile when no songs and no user media. */
export function memoryIsWordsOnly(memory: MemoryPublic): boolean {
  return memory.songCount === 0 && (memory.photos?.length ?? 0) === 0
}

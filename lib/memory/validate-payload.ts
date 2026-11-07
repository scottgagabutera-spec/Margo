import type { MemoryPhotoInput, MemorySongInput } from '@/lib/memory/types'
import { validateMemoryTitle } from '@/lib/memory/title'

export function hasMemoryContent(opts: {
  songs: MemorySongInput[]
  photos: MemoryPhotoInput[]
  story: string
}): boolean {
  if (opts.songs.length > 0) return true
  if (opts.photos.length > 0) return true
  return opts.story.trim().length > 0
}

export function validateMemoryCreatePayload(opts: {
  title: string
  songs: MemorySongInput[]
  photos: MemoryPhotoInput[]
  story: string
}): string | null {
  const titleErr = validateMemoryTitle(opts.title)
  if (titleErr) return titleErr
  if (!hasMemoryContent(opts)) {
    return 'Add at least one song, photo or video, or write your story.'
  }
  return null
}

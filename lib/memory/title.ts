export function memoryDefaultTitle(songCount: number): string {
  if (songCount <= 0) return 'Memory'
  if (songCount === 1) return '1 song'
  return `${songCount} songs`
}

export function memoryTitlePlaceholder(): string {
  return 'Give your memory a title'
}

export function validateMemoryTitle(title: string, songCount: number): string | null {
  const t = title.trim()
  if (songCount >= 2 && !t) return 'Title is required for memories with two or more songs.'
  if (t.length > 80) return 'Title is too long (80 characters max).'
  return null
}

export type MemoryCardKind = 'media' | 'story' | 'listening' | 'create'

export const MEMORY_CARD_ROTATION: MemoryCardKind[] = ['media', 'story', 'listening', 'create']

export function pickNextMemoryCard(last: MemoryCardKind | null | undefined): MemoryCardKind {
  if (!last) return MEMORY_CARD_ROTATION[0]!
  const idx = MEMORY_CARD_ROTATION.indexOf(last)
  const nextIdx = idx < 0 ? 0 : (idx + 1) % MEMORY_CARD_ROTATION.length
  return MEMORY_CARD_ROTATION[nextIdx]!
}

export function memoryCardCopy(
  kind: MemoryCardKind,
  opts: { ownMemoryCount: number; videosSupported?: boolean },
): { title: string; subtitle: string; periodPill?: string } {
  const videos = opts.videosSupported !== false
  switch (kind) {
    case 'media':
      return {
        title: videos ? 'Add photos and videos' : 'Add photos',
        subtitle: 'Turn a moment into a memory.',
      }
    case 'story':
      return {
        title: 'Tell your story',
        subtitle: 'Write what happened, in a few lines.',
      }
    case 'listening':
      return {
        title: 'What are you listening to?',
        subtitle: 'Save it for a week, a month or a year.',
        periodPill: 'This week',
      }
    case 'create':
      return {
        title: opts.ownMemoryCount === 0 ? 'Create your first memory' : 'Create a memory',
        subtitle: 'A photo, a song, a few words.',
      }
    default:
      return { title: 'Create a memory', subtitle: 'A photo, a song, a few words.' }
  }
}

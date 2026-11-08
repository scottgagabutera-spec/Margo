export type MemoryCardKind = 'media' | 'story' | 'listening' | 'create'

/** Fixed order A → B → C → D */
export const MEMORY_CARD_SEQUENCE: MemoryCardKind[] = ['media', 'story', 'listening', 'create']

export function dailyMemoryCardAnchorIndex(userId: string, dayKey: string): number {
  let h = 2166136261
  const s = `${userId}\0${dayKey}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % MEMORY_CARD_SEQUENCE.length
}

export function memoryCardKindForSlotIndex(anchorIndex: number, slotIndex: number): MemoryCardKind {
  return MEMORY_CARD_SEQUENCE[(anchorIndex + slotIndex) % MEMORY_CARD_SEQUENCE.length]!
}

export function localDayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

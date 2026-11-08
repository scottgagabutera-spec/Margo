export type MemoryPromoKind = 'pictures' | 'story' | 'memory'

/** Stable 0..3 index for legacy tests; promo planner uses full cycle anchor modulo 5. */
export function dailyMemoryCardAnchorIndex(userId: string, dayKey: string): number {
  let h = 2166136261
  const s = `${userId}\0${dayKey}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 5
}

export function localDayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function memoryCardCopy(
  kind: MemoryPromoKind,
  opts: { videosSupported?: boolean },
): { title: string; subtitle: string } {
  const videos = opts.videosSupported !== false
  switch (kind) {
    case 'pictures':
      return {
        title: videos ? 'Add photos and videos' : 'Add photos',
        subtitle: 'Turn a moment into a memory.',
      }
    case 'story':
      return {
        title: 'Tell your story',
        subtitle: 'Write what happened, in a few lines.',
      }
    case 'memory':
      return {
        title: 'Create a memory',
        subtitle: 'A photo, a song, a few words.',
      }
    default:
      return { title: 'Create a memory', subtitle: 'A photo, a song, a few words.' }
  }
}

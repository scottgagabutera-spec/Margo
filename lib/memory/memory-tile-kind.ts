import type { MemoryPublic } from '@/lib/memory/types'
import { memoryIsWordsOnly } from '@/lib/memory/display-caption'
import { inferListeningPeriodType } from '@/lib/memory/listening-infer'

export type MemoryTileKind = 'photo' | 'story' | 'listening'

export function memoryTileKind(memory: MemoryPublic): MemoryTileKind {
  if (
    inferListeningPeriodType({
      dateGranularity: memory.dateGranularity,
      dateStart: memory.dateStart,
      dateEnd: memory.dateEnd,
      songCount: memory.songCount,
      photoCount: memory.photos.length,
    }) === 'week'
  ) {
    return 'listening'
  }
  if (memoryIsWordsOnly(memory)) return 'story'
  return 'photo'
}

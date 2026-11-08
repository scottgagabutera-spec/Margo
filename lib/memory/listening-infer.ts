import type { MemoryDateGranularity } from '@/lib/memory/types'
import type { ListeningPeriodType } from '@/lib/memory/listening-period'
import { daysBetweenInclusive } from '@/lib/memory/listening-period'

export function inferListeningPeriodType(input: {
  dateGranularity: MemoryDateGranularity
  dateStart: string | null
  dateEnd: string | null
  songCount: number
  photoCount: number
}): ListeningPeriodType | null {
  if (input.songCount < 1 || input.photoCount > 0) return null
  if (input.dateGranularity === 'year' && input.dateStart) return 'year'
  if (input.dateGranularity === 'month' && input.dateStart) return 'month'
  if (input.dateGranularity === 'period' && input.dateStart && input.dateEnd) {
    const days = daysBetweenInclusive(input.dateStart, input.dateEnd)
    if (days > 0 && days <= 8) return 'week'
  }
  return null
}

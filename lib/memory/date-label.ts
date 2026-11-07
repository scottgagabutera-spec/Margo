import type { MemoryDateGranularity } from '@/lib/memory/types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parseDateOnly(iso: string | null): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y) return null
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

export function formatMemoryDatePublic(opts: {
  granularity: MemoryDateGranularity
  dateStart: string | null
  dateEnd: string | null
  showDatePublicly: boolean
}): string | null {
  if (!opts.showDatePublicly || opts.granularity === 'none') return null
  const start = parseDateOnly(opts.dateStart)
  if (!start) return null

  switch (opts.granularity) {
    case 'day':
      return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    case 'month':
      return `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`
    case 'year':
      return String(start.getUTCFullYear())
    case 'period': {
      const end = parseDateOnly(opts.dateEnd)
      const a = `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`
      if (!end) return `${a} — Still happening`
      const b = `${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`
      return `${a} — ${b}`
    }
    default:
      return null
  }
}

export function memoryTimelineYear(dateStart: string | null, createdAt: string): string {
  const start = parseDateOnly(dateStart)
  if (start) return String(start.getUTCFullYear())
  return new Date(createdAt).getUTCFullYear().toString()
}

import type { MemoryDateGranularity } from '@/lib/memory/types'

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseDateOnly(iso: string | null): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y) return null
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

function monthShort(d: Date): string {
  return MONTHS_SHORT[d.getUTCMonth()] ?? 'Jan'
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
      return `${start.getUTCDate()} ${monthShort(start)} ${start.getUTCFullYear()}`
    case 'month':
      return `${monthShort(start)} ${start.getUTCFullYear()}`
    case 'year':
      return String(start.getUTCFullYear())
    case 'period': {
      const end = parseDateOnly(opts.dateEnd)
      const a = `${monthShort(start)} ${start.getUTCFullYear()}`
      if (!end) return `Since ${a}`
      const b = `${monthShort(end)} ${end.getUTCFullYear()}`
      return `${a} to ${b}`
    }
    default:
      return null
  }
}

/** Long month labels for pickers and forms only. */
export function memoryMonthLabel(monthIndex: number): string {
  return MONTHS_LONG[monthIndex] ?? 'January'
}

export function memoryTimelineYear(dateStart: string | null, createdAt: string): string {
  const start = parseDateOnly(dateStart)
  if (start) return String(start.getUTCFullYear())
  return new Date(createdAt).getUTCFullYear().toString()
}

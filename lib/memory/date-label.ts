import type { MemoryDateGranularity } from '@/lib/memory/types'
import { inferListeningPeriodType } from '@/lib/memory/listening-infer'
import {
  formatListeningPeriodSummary,
  type ListeningPeriodType,
} from '@/lib/memory/listening-period'

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
  listeningPeriod?: ListeningPeriodType | null
  now?: Date
}): string | null {
  if (!opts.showDatePublicly) return null

  const listening =
    opts.listeningPeriod ??
    (opts.dateStart
      ? inferListeningPeriodType({
          dateGranularity: opts.granularity,
          dateStart: opts.dateStart,
          dateEnd: opts.dateEnd,
          songCount: 1,
          photoCount: 0,
        })
      : null)

  if (listening && opts.dateStart && opts.dateEnd) {
    return formatListeningPeriodSummary({
      type: listening,
      startIso: opts.dateStart,
      endIso: opts.dateEnd,
      now: opts.now,
    })
  }

  if (opts.granularity === 'none') return null
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

export function formatMemoryDisplayDate(input: {
  dateGranularity: MemoryDateGranularity
  dateStart: string | null
  dateEnd: string | null
  showDatePublicly: boolean
  createdAt: string
  songCount: number
  photoCount: number
  now?: Date
}): string | null {
  if (!input.showDatePublicly) return null
  const listening = inferListeningPeriodType({
    dateGranularity: input.dateGranularity,
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
    songCount: input.songCount,
    photoCount: input.photoCount,
  })
  const fromFields = formatMemoryDatePublic({
    granularity: input.dateGranularity,
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
    showDatePublicly: true,
    listeningPeriod: listening,
    now: input.now,
  })
  if (fromFields) return fromFields
  const created = new Date(input.createdAt)
  if (Number.isNaN(created.getTime())) return null
  return `${created.getUTCDate()} ${monthShort(created)} ${created.getUTCFullYear()}`
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

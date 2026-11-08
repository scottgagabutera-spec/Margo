export type ListeningPeriodType = 'week' | 'month' | 'year'

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Monday 00:00 local for the week containing ref. */
export function weekRangeContaining(ref: Date): { start: Date; end: Date; startIso: string; endIso: string } {
  const day = startOfDay(ref)
  const dow = day.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const start = new Date(day)
  start.setDate(day.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end, startIso: toIsoDateLocal(start), endIso: toIsoDateLocal(end) }
}

export function monthRangeContaining(ref: Date): { start: Date; end: Date; startIso: string; endIso: string } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  return { start, end, startIso: toIsoDateLocal(start), endIso: toIsoDateLocal(end) }
}

export function yearRangeContaining(ref: Date): { start: Date; end: Date; startIso: string; endIso: string } {
  const start = new Date(ref.getFullYear(), 0, 1)
  const end = new Date(ref.getFullYear(), 11, 31)
  return { start, end, startIso: toIsoDateLocal(start), endIso: toIsoDateLocal(end) }
}

export function shiftWeek(ref: Date, weeksAgo: number): { start: Date; end: Date; startIso: string; endIso: string } {
  const shifted = new Date(ref)
  shifted.setDate(shifted.getDate() - weeksAgo * 7)
  return weekRangeContaining(shifted)
}

export function shiftMonth(ref: Date, monthsAgo: number): { start: Date; end: Date; startIso: string; endIso: string } {
  const shifted = new Date(ref.getFullYear(), ref.getMonth() - monthsAgo, 1)
  return monthRangeContaining(shifted)
}

export function shiftYear(ref: Date, yearsAgo: number): { start: Date; end: Date; startIso: string; endIso: string } {
  const shifted = new Date(ref.getFullYear() - yearsAgo, ref.getMonth(), ref.getDate())
  return yearRangeContaining(shifted)
}

function monthShort(d: Date): string {
  return MONTHS_SHORT[d.getMonth()] ?? 'Jan'
}

function monthLong(d: Date): string {
  return MONTHS_LONG[d.getMonth()] ?? 'January'
}

function isRangeActive(start: Date, end: Date, now: Date): boolean {
  const n = startOfDay(now).getTime()
  return n >= startOfDay(start).getTime() && n <= startOfDay(end).getTime()
}

export function formatWeekArchiveLabel(startIso: string, endIso: string): string {
  const start = parseDateOnly(startIso)
  const end = parseDateOnly(endIso)
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `Week of ${start.getDate()} to ${end.getDate()} ${monthShort(end)} ${end.getFullYear()}`
  }
  return `Week of ${start.getDate()} ${monthShort(start)} to ${end.getDate()} ${monthShort(end)} ${end.getFullYear()}`
}

export function formatListeningPeriodSummary(opts: {
  type: ListeningPeriodType
  startIso: string
  endIso: string
  now?: Date
}): string {
  const now = opts.now ?? new Date()
  const start = parseDateOnly(opts.startIso)
  const end = parseDateOnly(opts.endIso)
  const active = isRangeActive(start, end, now)
  if (opts.type === 'week') {
    return active ? 'This week' : formatWeekArchiveLabel(opts.startIso, opts.endIso)
  }
  if (opts.type === 'month') {
    return active ? 'This month' : `${monthLong(start)} ${start.getFullYear()}`
  }
  return active ? 'This year' : String(start.getFullYear())
}

export function formatListeningPeriodFooterLabel(opts: {
  type: ListeningPeriodType
  startIso: string
  endIso: string
}): string {
  if (opts.type === 'week') return formatWeekArchiveLabel(opts.startIso, opts.endIso)
  if (opts.type === 'month') {
    const start = parseDateOnly(opts.startIso)
    return `${monthLong(start)} ${start.getFullYear()}`
  }
  return String(parseDateOnly(opts.startIso).getFullYear())
}

export type ListeningPeriodChoice = {
  id: string
  heading: string
  sub: string
  startIso: string
  endIso: string
}

export function listeningPeriodChoices(type: ListeningPeriodType, now = new Date()): ListeningPeriodChoice[] {
  if (type === 'week') {
    const headings = ['This week', 'Last week', '2 weeks ago', '3 weeks ago']
    return headings.map((heading, i) => {
      const r = shiftWeek(now, i)
      const sub =
        r.start.getMonth() === r.end.getMonth()
          ? `${r.start.getDate()} to ${r.end.getDate()} ${monthShort(r.end)} ${r.end.getFullYear()}`
          : `${r.start.getDate()} ${monthShort(r.start)} to ${r.end.getDate()} ${monthShort(r.end)} ${r.end.getFullYear()}`
      return { id: `w-${i}`, heading, sub, startIso: r.startIso, endIso: r.endIso }
    })
  }
  if (type === 'month') {
    const headings = ['This month', 'Last month', '2 months ago', '3 months ago']
    return headings.map((heading, i) => {
      const r = shiftMonth(now, i)
      const sub = `${monthLong(r.start)} ${r.start.getFullYear()}`
      return { id: `m-${i}`, heading, sub, startIso: r.startIso, endIso: r.endIso }
    })
  }
  return [0, 1, 2, 3].map((i) => {
    const r = shiftYear(now, i)
    const y = r.start.getFullYear()
    if (i === 0) return { id: `y-${i}`, heading: 'This year', sub: String(y), startIso: r.startIso, endIso: r.endIso }
    if (i === 1) return { id: `y-${i}`, heading: 'Last year', sub: String(y), startIso: r.startIso, endIso: r.endIso }
    if (i === 2) return { id: `y-${i}`, heading: String(y), sub: '2 years ago', startIso: r.startIso, endIso: r.endIso }
    return { id: `y-${i}`, heading: String(y), sub: '3 years ago', startIso: r.startIso, endIso: r.endIso }
  })
}

export function listeningDateGranularity(type: ListeningPeriodType): 'period' | 'month' | 'year' {
  if (type === 'week') return 'period'
  if (type === 'month') return 'month'
  return 'year'
}

export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = parseDateOnly(startIso)
  const end = parseDateOnly(endIso)
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1
}

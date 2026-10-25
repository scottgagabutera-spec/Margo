function toMs(input: number | string | Date): number {
  if (typeof input === 'number') return input
  if (input instanceof Date) return input.getTime()
  return new Date(input).getTime()
}

const DAY_SEC = 86_400
const WEEK_SEC = 7 * DAY_SEC
const MONTH_SEC = 30 * DAY_SEC
const YEAR_SEC = 365 * DAY_SEC

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/**
 * Feed post card muted line under lyric — relative only (no calendar dates).
 * Thresholds: &lt;7d days · &lt;30d weeks · &lt;365d months · else years.
 */
export function formatSharedRelativeTime(
  input: number | string | Date,
  nowMs: number = Date.now(),
): string {
  const then = toMs(input)
  if (!Number.isFinite(then)) return ''

  if (then > nowMs) return 'just now'

  const diffSec = Math.max(0, (nowMs - then) / 1000)

  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60)
    return `${m} ${plural(m, 'minute', 'minutes')} ago`
  }
  if (diffSec < DAY_SEC) {
    const h = Math.floor(diffSec / 3600)
    return `${h} ${plural(h, 'hour', 'hours')} ago`
  }
  if (diffSec < WEEK_SEC) {
    const d = Math.floor(diffSec / DAY_SEC)
    return `${d} ${plural(d, 'day', 'days')} ago`
  }
  if (diffSec < MONTH_SEC) {
    const w = Math.floor(diffSec / WEEK_SEC)
    return `${w} ${plural(w, 'week', 'weeks')} ago`
  }
  if (diffSec < YEAR_SEC) {
    const mo = Math.floor(diffSec / MONTH_SEC)
    return `${mo} ${plural(mo, 'month', 'months')} ago`
  }
  const y = Math.floor(diffSec / YEAR_SEC)
  return `${y} ${plural(y, 'year', 'years')} ago`
}

/** Full calendar label for title/tooltip on posted-time line. */
export function formatSharedTimeTitle(input: number | string | Date): string {
  const then = toMs(input)
  if (!Number.isFinite(then)) return ''
  const thenDate = new Date(then)
  return thenDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

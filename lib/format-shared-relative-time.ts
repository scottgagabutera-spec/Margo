function toMs(input: number | string | Date): number {
  if (typeof input === 'number') return input
  if (input instanceof Date) return input.getTime()
  return new Date(input).getTime()
}

function formatAbsoluteDate(thenMs: number, nowMs: number): string {
  const then = new Date(thenMs)
  const month = then.toLocaleString('en-US', { month: 'short' })
  const day = then.getDate()
  const thenYear = then.getFullYear()
  const nowYear = new Date(nowMs).getFullYear()
  if (thenYear === nowYear) return `${month} ${day}`
  return `${month} ${day}, ${thenYear}`
}

const DAY_SEC = 86_400
const WEEK_SEC = 7 * DAY_SEC

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

/**
 * Feed post card: "Shared 1 day ago" (muted line under lyric).
 */
export function formatSharedRelativeTime(
  input: number | string | Date,
  nowMs: number = Date.now(),
): string {
  const then = toMs(input)
  if (!Number.isFinite(then)) return ''

  const diffSec = Math.max(0, (nowMs - then) / 1000)

  if (diffSec < 60) return 'Shared just now'
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60)
    return `Shared ${m} ${plural(m, 'minute', 'minutes')} ago`
  }
  if (diffSec < DAY_SEC) {
    const h = Math.floor(diffSec / 3600)
    return `Shared ${h} ${plural(h, 'hour', 'hours')} ago`
  }
  if (diffSec < WEEK_SEC) {
    const d = Math.floor(diffSec / DAY_SEC)
    return `Shared ${d} ${plural(d, 'day', 'days')} ago`
  }
  return `Shared ${formatAbsoluteDate(then, nowMs)}`
}

/** Full calendar label for title/tooltip on shared-time line. */
export function formatSharedTimeTitle(input: number | string | Date): string {
  const then = toMs(input)
  if (!Number.isFinite(then)) return ''
  const thenDate = new Date(then)
  return thenDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

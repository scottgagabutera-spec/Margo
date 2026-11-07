/** Hours after welcome anchor before each timed nudge may fire. */
export const WELCOME_NUDGE_DELAY_HOURS: Record<'first_memory' | 'first_lyric' | 'follow_people', number> = {
  first_memory: 24,
  first_lyric: 48,
  follow_people: 72,
}

export function utcCalendarDay(iso: string | Date | number): string {
  const d = typeof iso === 'number' ? new Date(iso) : typeof iso === 'string' ? new Date(iso) : iso
  return d.toISOString().slice(0, 10)
}

export function hoursSince(isoAnchor: string, nowMs: number): number {
  const anchor = Date.parse(isoAnchor)
  if (Number.isNaN(anchor)) return 0
  return (nowMs - anchor) / (60 * 60 * 1000)
}

/**
 * Preview-only time compression. Production always returns 1.
 * Set WELCOME_SERIES_PREVIEW_TIME_SCALE=0.001 on preview to turn 24h into ~86s.
 */
export function welcomeSeriesTimeScale(): number {
  if (process.env.VERCEL_ENV === 'production') return 1
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return 1
  const raw = process.env.WELCOME_SERIES_PREVIEW_TIME_SCALE
  if (!raw) return 1
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.min(n, 1)
}

export function effectiveHoursSinceAnchor(
  isoAnchor: string,
  nowMs: number,
  devOverrideHours: number | null,
): number {
  if (devOverrideHours != null && Number.isFinite(devOverrideHours) && devOverrideHours >= 0) {
    return devOverrideHours
  }
  return hoursSince(isoAnchor, nowMs) * welcomeSeriesTimeScale()
}

export function isWelcomeSeriesDevOverrideAllowed(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') return false
  return process.env.WELCOME_SERIES_PREVIEW_TIME_SCALE != null
    && process.env.WELCOME_SERIES_PREVIEW_TIME_SCALE !== ''
    && process.env.WELCOME_SERIES_PREVIEW_TIME_SCALE !== '1'
}

/** Calendar day bucket for DM thread separators (local timezone). */
export function threadDayLabel(iso: string, nowMs = Date.now()): string {
  const then = new Date(iso)
  if (!Number.isFinite(then.getTime())) return ''

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  const todayStart = startOfDay(new Date(nowMs))
  const thenStart = startOfDay(then)
  const diffDays = Math.round((todayStart - thenStart) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  const weekday = then.toLocaleDateString(undefined, { weekday: 'long' })
  if (diffDays < 7) return weekday

  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: then.getFullYear() !== new Date(nowMs).getFullYear() ? 'numeric' : undefined,
  })
}

export function threadDayKey(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

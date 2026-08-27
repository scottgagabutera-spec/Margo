export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3)
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** Progress 0→1 for a window [start, start+duration]. */
export function windowProgress(timeSec: number, start: number, duration: number): number {
  if (duration <= 0) return timeSec >= start ? 1 : 0
  return easeOutCubic((timeSec - start) / duration)
}

/** Feed/card navigation: ignore scroll drags and long presses. */
export const PRECISE_TAP_MAX_PX = 8
export const PRECISE_TAP_MAX_MS = 300

export type PreciseTapStart = {
  x: number
  y: number
  t: number
}

export function isPreciseTap(start: PreciseTapStart | null, endX: number, endY: number, endT: number): boolean {
  if (!start) return false
  const dx = Math.abs(endX - start.x)
  const dy = Math.abs(endY - start.y)
  const dt = endT - start.t
  return dx < PRECISE_TAP_MAX_PX && dy < PRECISE_TAP_MAX_PX && dt < PRECISE_TAP_MAX_MS
}

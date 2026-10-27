/** CSS transition duration for landing hero bump (matches globals.css). */
export const LANDING_SHIFT_TRANSITION_MS = 200

export function shouldAnimateLandingShift(prevShift: number, nextShift: number): boolean {
  if (nextShift <= 0 && prevShift <= 0) return false
  if (nextShift === 0 && prevShift > 0) return true
  if (nextShift > 0 && prevShift === 0) return true
  if (nextShift > 0 && prevShift > 0) {
    return Math.abs(nextShift - prevShift) > 2
  }
  return false
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

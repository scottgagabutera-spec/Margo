/**
 * Pure motion helpers for primary-tab swipe settle / rubber-band.
 * No DOM — portable to a future RN Reanimated port (APP READY).
 */

export type SpringState = {
  offset: number
  /** px per ms */
  velocity: number
}

/** Asymptotic edge resistance — never navigates; visually soft stop. */
export function rubberBandOffset(dx: number, width: number): number {
  const dim = Math.max(1, width)
  const sign = dx < 0 ? -1 : 1
  const x = Math.abs(dx)
  const limit = dim * 0.4
  return sign * ((x * limit) / (limit + x))
}

/**
 * Semi-implicit spring toward `target`.
 * Units: offset px, velocity px/ms, dt ms.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  dtMs: number
): SpringState & { done: boolean } {
  const dt = Math.min(32, Math.max(1, dtMs))
  // Tuned for full-width tab settles (~200–320ms typical).
  const stiffness = 0.0024
  const damping = 0.038
  const x = state.offset - target
  const accel = -stiffness * x - damping * state.velocity
  const velocity = state.velocity + accel * dt
  const offset = state.offset + velocity * dt
  if (Math.abs(offset - target) < 0.8 && Math.abs(velocity) < 0.045) {
    return { offset: target, velocity: 0, done: true }
  }
  return { offset, velocity, done: false }
}

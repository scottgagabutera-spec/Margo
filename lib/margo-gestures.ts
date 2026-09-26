/** Compose line combine — quick hold. */
export const MARGO_COMBINE_LONG_PRESS_MS = 400

/** Context menus / action sheets — deliberate hold (~0.7s). */
export const MARGO_CONTEXT_LONG_PRESS_MS = 720

/** Cancel hold if finger moves beyond this (px). */
export const MARGO_LONG_PRESS_MOVE_PX = 12

/** Light haptic when a context long-press fires (best-effort). */
export function margoContextHaptic() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(12)
    } catch {
      /* ignore */
    }
  }
}

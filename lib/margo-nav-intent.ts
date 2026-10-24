/** Fired when in-app navigation starts (tap confirmed). */
export const MARGO_NAV_START = 'margo:nav-start'
export const MARGO_NAV_END = 'margo:nav-end'

export function signalNavStart() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MARGO_NAV_START))
}

export function signalNavEnd() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MARGO_NAV_END))
}

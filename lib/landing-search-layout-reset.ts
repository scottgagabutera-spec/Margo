const ACTIVE_ATTR = 'data-margo-landing-search-active'
const HIDE_TAGLINE = 'data-margo-landing-hide-tagline'
const HIDE_WORDMARK = 'data-margo-landing-hide-wordmark'

/** Clear landing search keyboard layout state (idle hero at 41%). */
export function resetLandingSearchLayoutState(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.removeAttribute(ACTIVE_ATTR)
  root.removeAttribute(HIDE_TAGLINE)
  root.removeAttribute(HIDE_WORDMARK)
  root.style.removeProperty('--margo-landing-hero-shift')
  root.style.removeProperty('--margo-landing-search-dropdown-max-h')
  root.style.removeProperty('--margo-landing-hero-active-top')
}

const ACTIVE = 'data-margo-compose-search-active'
const ANIMATE = 'data-margo-compose-shift-animate'

export function resetComposeSearchLayoutState(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.removeAttribute(ACTIVE)
  root.removeAttribute(ANIMATE)
  root.style.removeProperty('--margo-compose-search-shift')
  root.style.removeProperty('--margo-compose-search-dropdown-max-h')
}

const LB_PANEL_SCROLL_MS = 250

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Smoothly align a feed LB panel under the app header (post body may scroll off-screen). */
export function scrollFeedLyricBackPanelIntoView(panel: HTMLElement | null): void {
  if (!panel) return
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  panel.scrollIntoView({ behavior, block: 'start' })
  if (behavior === 'smooth') {
    window.setTimeout(() => {
      panel.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, LB_PANEL_SCROLL_MS + 40)
  }
}

export function scrollPostCardTopIntoView(card: HTMLElement | null): void {
  if (!card) return
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  card.scrollIntoView({ behavior, block: 'start' })
}

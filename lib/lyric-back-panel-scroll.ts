function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function scrollPostCardTopIntoView(card: HTMLElement | null): void {
  if (!card) return
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  card.scrollIntoView({ behavior, block: 'start' })
}

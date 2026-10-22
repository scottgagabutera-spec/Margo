import { feedSearchScrollDelta } from '@/lib/lyric-back-keyboard'

const SEARCH_UNDER_NAV_GAP_PX = 12

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readPxVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

/**
 * One instant pane scroll so the Lyric Back search sits just under the nav
 * (and under the vibe filter bar when that bar is on screen).
 * Does not call scrollIntoView.
 */
export function scrollFeedLyricBackSearchUnderNav(panel: HTMLElement | null): void {
  if (!panel || typeof document === 'undefined') return
  const search = panel.querySelector('.margo-post-card__lb-search-anchor')
  if (!(search instanceof HTMLElement)) return
  const searchRect = search.getBoundingClientRect()
  if (searchRect.width === 0 && searchRect.height === 0) return
  const pane = panel.closest('[data-margo-primary-tab]')
  if (!(pane instanceof HTMLElement)) return

  const vibe = document.querySelector('.margo-feed-vibe-bar')
  const chromeBelowNav = vibe instanceof HTMLElement ? vibe.getBoundingClientRect().height : 0
  const delta = feedSearchScrollDelta({
    searchTop: searchRect.top,
    navHeight: readPxVar('--nav-height', 72),
    chromeBelowNav,
    gap: SEARCH_UNDER_NAV_GAP_PX,
  })
  if (Math.abs(delta) < 1) return
  pane.scrollTop += delta
}

export function scrollPostCardTopIntoView(card: HTMLElement | null): void {
  if (!card) return
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  card.scrollIntoView({ behavior, block: 'start' })
}


export const LYRIC_BACK_PANEL_OPEN_GAP_PX = 8

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function readPxVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

export function readFeedLyricBackChromeHeights(): {
  navHeight: number
  tabBarHeight: number
  vibeBarHeight: number
} {
  if (typeof document === 'undefined') {
    return { navHeight: 72, tabBarHeight: 44, vibeBarHeight: 0 }
  }
  const tabBar = document.querySelector('.margo-feed-content-tab-bar')
  const vibe = document.querySelector('.margo-feed-vibe-bar')
  const keyboardChrome = document.documentElement.getAttribute('data-margo-keyboard') === '1'
  return {
    navHeight: readPxVar('--nav-height', 72),
    tabBarHeight: keyboardChrome
      ? 0
      : tabBar instanceof HTMLElement
        ? tabBar.getBoundingClientRect().height
        : readPxVar('--margo-feed-tab-bar-h', 44),
    vibeBarHeight: vibe instanceof HTMLElement ? vibe.getBoundingClientRect().height : 0,
  }
}

export function feedLyricBackHeadroomTop(chrome = readFeedLyricBackChromeHeights()): number {
  return (
    chrome.navHeight
    + chrome.tabBarHeight
    + chrome.vibeBarHeight
    + LYRIC_BACK_PANEL_OPEN_GAP_PX
  )
}

export function feedLyricBackPanelBarScrollDelta(barTop: number, chrome = readFeedLyricBackChromeHeights()): number {
  const desiredTop = feedLyricBackHeadroomTop(chrome)
  return barTop - desiredTop
}

export function findFeedPrimaryScrollPane(from: HTMLElement): HTMLElement | null {
  const pane = from.closest('[data-margo-primary-tab="feed"]')
  return pane instanceof HTMLElement ? pane : null
}

export type FeedScrollSnapshot = { pane: HTMLElement; scrollTop: number }

export function captureFeedScrollSnapshot(from: HTMLElement): FeedScrollSnapshot | null {
  const pane = findFeedPrimaryScrollPane(from)
  if (!pane) return null
  return { pane, scrollTop: pane.scrollTop }
}

export function restoreFeedScrollSnapshot(snapshot: FeedScrollSnapshot | null): void {
  if (!snapshot?.pane) return
  snapshot.pane.scrollTop = snapshot.scrollTop
}

/** scrollTop that pushes the nested anchor fully above the list top. */
export function lyricBackNestedAnchorScrollTop(input: {
  scrollTop: number
  anchorBottom: number
  scrollerTop: number
}): number {
  return Math.max(0, Math.round(input.scrollTop + input.anchorBottom - input.scrollerTop))
}

function findLyricBackPin(root: HTMLElement): HTMLElement | null {
  const el = root.querySelector('[data-lb-pin="1"], .margo-lb-focus__pin')
  return el instanceof HTMLElement ? el : null
}

/** Scroll the feed pane so the panel bar sits under Lyrics/Shorts (and vibe bar when shown). */
export function scrollFeedLyricBackPanelIntoView(panel: HTMLElement | null): boolean {
  if (!panel || typeof document === 'undefined') return false
  const bar = findLyricBackPin(panel)
  if (!(bar instanceof HTMLElement)) return false
  const barRect = bar.getBoundingClientRect()
  if (barRect.width === 0 && barRect.height === 0) return false
  const pane = findFeedPrimaryScrollPane(panel)
  if (!pane) return false
  const delta = feedLyricBackPanelBarScrollDelta(barRect.top)
  if (Math.abs(delta) < 1) return false
  pane.scrollTop += delta
  return true
}

export function scrollPostCardTopIntoView(card: HTMLElement | null): void {
  if (!card) return
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  card.scrollIntoView({ behavior, block: 'start' })
}

/** Post page: one window scroll so the Lyric Back bar sits under the nav. */
export function scrollPostLyricBackSectionIntoView(section: HTMLElement | null): boolean {
  if (!section || typeof window === 'undefined') return false
  const bar = findLyricBackPin(section)
  if (!(bar instanceof HTMLElement)) return false
  const barRect = bar.getBoundingClientRect()
  if (barRect.width === 0 && barRect.height === 0) return false
  const desiredTop = readPxVar('--nav-height', 72) + LYRIC_BACK_PANEL_OPEN_GAP_PX
  const delta = barRect.top - desiredTop
  if (Math.abs(delta) < 1) return false
  window.scrollBy(0, delta)
  return true
}

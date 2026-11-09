import type { FeedContentTab } from '@/lib/feed-content-tab'
import { parseFeedContentTab } from '@/lib/feed-content-tab'
import { alignFeedPrimaryFrozenScroll } from '@/components/primary-tab-shell'

/** Session map for mix / stack return when DOM is not yet ready. */
const feedSubTabScrollY: Partial<Record<FeedContentTab, number>> = {}

export function readFeedSubTabScroller(tab: FeedContentTab): HTMLElement | null {
  const el = document.querySelector(`[data-margo-feed-subtab="${tab}"]`)
  return el instanceof HTMLElement ? el : null
}

function sectorVerticalScroll(el: HTMLElement, tab: FeedContentTab): number {
  if (tab === 'shorts') {
    const pager = el.querySelector('.margo-feed-shorts-pager')
    if (pager instanceof HTMLElement) return pager.scrollTop
  }
  return el.scrollTop
}

export function readFeedSubTabScrollY(tab: FeedContentTab): number {
  const live = readFeedSubTabScroller(tab)
  if (live) return sectorVerticalScroll(live, tab)
  return feedSubTabScrollY[tab] ?? 0
}

export function currentFeedContentTabFromLocation(): FeedContentTab {
  if (typeof window === 'undefined') return 'lyrics'
  return parseFeedContentTab(new URLSearchParams(window.location.search).get('tab'))
}

export function readActiveFeedSubTabScrollY(tab?: FeedContentTab): number {
  const resolved = tab ?? currentFeedContentTabFromLocation()
  return readFeedSubTabScrollY(resolved)
}

export function captureFeedSubTabScroll(tab: FeedContentTab): void {
  feedSubTabScrollY[tab] = readFeedSubTabScrollY(tab)
}

export function scrollFeedSubTabTo(tab: FeedContentTab, y: number): void {
  const el = readFeedSubTabScroller(tab)
  if (!el) return
  if (tab === 'shorts') {
    const pager = el.querySelector('.margo-feed-shorts-pager')
    if (pager instanceof HTMLElement) {
      pager.scrollTop = y
      return
    }
  }
  el.scrollTop = y
  if (tab === 'lyrics') alignFeedPrimaryFrozenScroll(y)
}

export function resetFeedSubTabScroll(tab: FeedContentTab): void {
  scrollFeedSubTabTo(tab, 0)
  const el = readFeedSubTabScroller(tab)
  if (el) el.scrollLeft = 0
  if (tab === 'shorts') {
    const pager = el?.querySelector('.margo-feed-shorts-pager')
    if (pager instanceof HTMLElement) pager.scrollTop = 0
  }
  feedSubTabScrollY[tab] = 0
}

/** Mix / Android back: apply saved Y to the sector scroller. */
export function restoreFeedSubTabScroll(tab: FeedContentTab, y?: number): void {
  const target = typeof y === 'number' ? y : feedSubTabScrollY[tab] ?? 0
  feedSubTabScrollY[tab] = target
  scrollFeedSubTabTo(tab, target)
  requestAnimationFrame(() => scrollFeedSubTabTo(tab, target))
}

export function isFeedContentSubTab(tab: string): tab is 'memories' | 'shorts' | 'echoes' {
  return tab === 'memories' || tab === 'shorts' || tab === 'echoes'
}

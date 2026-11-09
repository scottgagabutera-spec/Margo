import type { FeedContentTab } from '@/lib/feed-content-tab'
import {
  alignFeedPrimaryFrozenScroll,
  clearPrimaryTabScroll,
} from '@/components/primary-tab-shell'

/** In-memory scroll per feed sub-tab (session-only; not margo-feed-return). */
const feedSubTabScrollY: Partial<Record<FeedContentTab, number>> = {}

export function readFeedPrimaryScroller(): HTMLElement | null {
  const el = document.querySelector('[data-margo-primary-tab="feed"]')
  return el instanceof HTMLElement ? el : null
}

export function captureFeedSubTabScroll(tab: FeedContentTab): void {
  const el = readFeedPrimaryScroller()
  if (!el) return
  feedSubTabScrollY[tab] = el.scrollTop
}

function applyScrollerY(target: number): void {
  const el = readFeedPrimaryScroller()
  if (!el) return
  el.style.overflowAnchor = 'none'
  if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target
}

function afterPaintTwice(apply: () => void): void {
  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}

/** Zero feed pane scroll for Memories / Shorts / Echoes without touching return-restore APIs. */
export function resetFeedScrollerForContentSubTab(): void {
  if (typeof window === 'undefined') return
  clearPrimaryTabScroll('feed')
  alignFeedPrimaryFrozenScroll(0)

  afterPaintTwice(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    applyScrollerY(0)
    const el = readFeedPrimaryScroller()
    if (el) el.scrollLeft = 0
  })
}

export function restoreFeedSubTabScrollAfterPaint(tab: FeedContentTab): void {
  const target = feedSubTabScrollY[tab] ?? 0
  if (typeof window === 'undefined') return
  afterPaintTwice(() => {
    applyScrollerY(target)
    if (tab === 'lyrics') alignFeedPrimaryFrozenScroll(target)
  })
}

export function isFeedContentSubTab(tab: string): tab is 'memories' | 'shorts' | 'echoes' {
  return tab === 'memories' || tab === 'shorts' || tab === 'echoes'
}

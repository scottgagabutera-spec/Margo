import { parseFeedContentTab, type FeedContentTab } from '@/lib/feed-content-tab'

export const FEED_RETURN_STORAGE_KEY = 'margo-feed-resume'

export type FeedReturnSnapshot = {
  y: number
  at: number
  anchorId?: string | null
  tab: FeedContentTab
  memoriesRowX: number
  shortsStripX: number
  shortsAt: number | null
  href?: string
}

function readRaw(): FeedReturnSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(FEED_RETURN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<FeedReturnSnapshot> & { y?: number; at?: number }
    if (typeof parsed.y !== 'number' || typeof parsed.at !== 'number') return null
    if (Date.now() - parsed.at > 12 * 60 * 60 * 1000) return null
    return {
      y: parsed.y,
      at: parsed.at,
      anchorId: parsed.anchorId ?? null,
      tab: parsed.tab ? parseFeedContentTab(parsed.tab) : 'lyrics',
      memoriesRowX: typeof parsed.memoriesRowX === 'number' ? parsed.memoriesRowX : 0,
      shortsStripX: typeof parsed.shortsStripX === 'number' ? parsed.shortsStripX : 0,
      shortsAt: typeof parsed.shortsAt === 'number' ? parsed.shortsAt : null,
      href: parsed.href,
    }
  } catch {
    return null
  }
}

export function readFeedReturnSnapshot(): FeedReturnSnapshot | null {
  return readRaw()
}

export function captureFeedReturnFromDom(tab?: FeedContentTab): Omit<FeedReturnSnapshot, 'y' | 'at' | 'anchorId'> {
  const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
  const memories = document.querySelector('.margo-feed-memories-row__scroller')
  const shorts = document.querySelector('.margo-feed-shorts-strip__row')
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const shortsAtRaw = params.get('shortsAt')
  const shortsAt = shortsAtRaw != null && Number.isFinite(Number(shortsAtRaw)) ? Math.floor(Number(shortsAtRaw)) : null
  return {
    tab: tab ?? parseFeedContentTab(params.get('tab')),
    memoriesRowX: memories instanceof HTMLElement ? memories.scrollLeft : 0,
    shortsStripX: shorts instanceof HTMLElement ? shorts.scrollLeft : 0,
    shortsAt,
    href: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/feed',
  }
}

export function writeFeedReturnSnapshot(patch: Partial<FeedReturnSnapshot> & { y?: number }) {
  if (typeof window === 'undefined') return
  const prev = readRaw()
  const dom = captureFeedReturnFromDom(patch.tab ?? prev?.tab)
  const next: FeedReturnSnapshot = {
    y: typeof patch.y === 'number' ? patch.y : (prev?.y ?? 0),
    at: Date.now(),
    anchorId: patch.anchorId !== undefined ? patch.anchorId : (prev?.anchorId ?? null),
    tab: patch.tab ?? prev?.tab ?? dom.tab,
    memoriesRowX: patch.memoriesRowX ?? prev?.memoriesRowX ?? dom.memoriesRowX,
    shortsStripX: patch.shortsStripX ?? prev?.shortsStripX ?? dom.shortsStripX,
    shortsAt: patch.shortsAt !== undefined ? patch.shortsAt : (prev?.shortsAt ?? dom.shortsAt),
    href: patch.href ?? prev?.href ?? dom.href,
  }
  try {
    localStorage.setItem(FEED_RETURN_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode */
  }
}

export function persistFeedReturnBeforeLeave(tab?: FeedContentTab) {
  const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
  const y = scroller instanceof HTMLElement ? scroller.scrollTop : 0
  const dom = captureFeedReturnFromDom(tab)
  writeFeedReturnSnapshot({ y, ...dom, tab: tab ?? dom.tab })
}

export function applyFeedReturnHorizontals(snap: FeedReturnSnapshot) {
  if (typeof document === 'undefined') return
  window.requestAnimationFrame(() => {
    if (snap.memoriesRowX > 0) {
      const row = document.querySelector('.margo-feed-memories-row__scroller')
      if (row instanceof HTMLElement) row.scrollLeft = snap.memoriesRowX
    }
    if (snap.shortsStripX > 0) {
      const strip = document.querySelector('.margo-feed-shorts-strip__row')
      if (strip instanceof HTMLElement) strip.scrollLeft = snap.shortsStripX
    }
  })
}

/** @deprecated use persistFeedReturnBeforeLeave */
export function saveMargoReturn(state: { href: string; feedTab?: string | null; scrollY?: number; memoriesRowX?: number; shortsStripX?: number }) {
  persistFeedReturnBeforeLeave(parseFeedContentTab(state.feedTab ?? undefined))
  writeFeedReturnSnapshot({
    y: state.scrollY ?? 0,
    href: state.href,
    tab: parseFeedContentTab(state.feedTab ?? undefined),
    memoriesRowX: state.memoriesRowX ?? 0,
    shortsStripX: state.shortsStripX ?? 0,
  })
}

export function readMargoReturn() {
  const snap = readFeedReturnSnapshot()
  if (!snap) return null
  return {
    href: snap.href || '/feed',
    feedTab: snap.tab,
    scrollY: snap.y,
    memoriesRowX: snap.memoriesRowX,
    shortsStripX: snap.shortsStripX,
  }
}

export function clearMargoReturn() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(FEED_RETURN_STORAGE_KEY)
  } catch {
    /* */
  }
}

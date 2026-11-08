import { applyFeedContentTab, parseFeedContentTab, type FeedContentTab } from './feed-content-tab.ts'

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

export function buildFeedResumeHref(input?: {
  tab?: FeedContentTab
  shortsAt?: number | null
  vibe?: string | null
}): string {
  const tab = input?.tab ?? 'lyrics'
  let params = applyFeedContentTab(new URLSearchParams(), tab)
  if (input?.shortsAt != null && tab === 'shorts') {
    params.set('shortsAt', String(input.shortsAt))
  }
  if (input?.vibe) params.set('vibe', input.vibe)
  const qs = params.toString()
  return qs ? `/feed?${qs}` : '/feed'
}

export function mergeFeedReturnSnapshot(
  prev: Partial<FeedReturnSnapshot> | null,
  dom: Omit<FeedReturnSnapshot, 'y' | 'at' | 'anchorId'>,
  y: number,
  anchorId?: string | null,
): FeedReturnSnapshot {
  const tab = prev?.tab ?? dom.tab
  const shortsAt = prev?.shortsAt !== undefined ? prev.shortsAt : dom.shortsAt
  const href =
    typeof dom.href === 'string' && dom.href.startsWith('/feed')
      ? dom.href
      : buildFeedResumeHref({ tab, shortsAt })
  return {
    y,
    at: Date.now(),
    anchorId: anchorId === undefined ? (prev?.anchorId ?? null) : anchorId,
    tab,
    memoriesRowX: dom.memoriesRowX,
    shortsStripX: dom.shortsStripX,
    shortsAt,
    href,
  }
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
  const y = typeof patch.y === 'number' ? patch.y : (prev?.y ?? 0)
  const merged = mergeFeedReturnSnapshot(
    { ...prev, ...patch },
    {
      ...dom,
      tab: patch.tab ?? prev?.tab ?? dom.tab,
      memoriesRowX: patch.memoriesRowX ?? dom.memoriesRowX,
      shortsStripX: patch.shortsStripX ?? dom.shortsStripX,
      shortsAt: patch.shortsAt !== undefined ? patch.shortsAt : dom.shortsAt,
    },
    y,
    patch.anchorId !== undefined ? patch.anchorId : prev?.anchorId,
  )
  try {
    localStorage.setItem(FEED_RETURN_STORAGE_KEY, JSON.stringify(merged))
  } catch {
    /* private mode */
  }
}

export function persistFeedReturnBeforeLeave(tab?: FeedContentTab) {
  const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
  const y = scroller instanceof HTMLElement ? scroller.scrollTop : 0
  const dom = captureFeedReturnFromDom(tab)
  writeFeedReturnSnapshot({ y, tab: tab ?? dom.tab })
}

export function applyFeedReturnHorizontals(snap: FeedReturnSnapshot) {
  if (typeof document === 'undefined') return
  const row = document.querySelector('.margo-feed-memories-row__scroller')
  if (row instanceof HTMLElement) row.scrollLeft = snap.memoriesRowX
  const strip = document.querySelector('.margo-feed-shorts-strip__row')
  if (strip instanceof HTMLElement) strip.scrollLeft = snap.shortsStripX
}

/**
 * The saved-tab restore may only run on first mount or on a real Back
 * (popstate). Forward tab taps (Lyrics → Memories/Shorts) must never be
 * bounced back to the saved tab.
 */
export function shouldRestoreFeedTabOnNav(input: { restored: boolean; viaPop: boolean }): boolean {
  return !input.restored || input.viaPop
}

export function shouldReapplyFeedReturn(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem('margo-feed-return-pending') === '1'
  } catch {
    return false
  }
}

export function clearFeedReturnPending() {
  try {
    sessionStorage.removeItem('margo-feed-return-pending')
  } catch {
    /* */
  }
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

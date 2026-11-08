import { readFeedReturnSnapshot } from '@/lib/margo-feed-return'

export const FEED_STACK_PIN_KEY = 'margo-feed-stack-pin'
export const FEED_STACK_SCROLL_Y_KEY = 'margo-feed-stack-scroll-y'
export const MARGO_FEED_STACK_PIN_EVENT = 'margo:feed-stack-pin'

export function pinFeedStackFromFeed() {
  if (typeof window === 'undefined') return
  try {
    const snap = readFeedReturnSnapshot()
    const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
    const y = snap?.y ?? (scroller instanceof HTMLElement ? scroller.scrollTop : 0)
    sessionStorage.setItem(FEED_STACK_PIN_KEY, '1')
    sessionStorage.setItem(FEED_STACK_SCROLL_Y_KEY, String(y))
  } catch {
    /* */
  }
  window.dispatchEvent(new Event(MARGO_FEED_STACK_PIN_EVENT))
}

export function readFeedStackScrollY(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(FEED_STACK_SCROLL_Y_KEY)
    if (raw == null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function clearFeedStackScrollY() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(FEED_STACK_SCROLL_Y_KEY)
  } catch {
    /* */
  }
}

export function clearFeedStackPin() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(FEED_STACK_PIN_KEY)
  } catch {
    /* */
  }
}

export function readFeedStackPinned(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(FEED_STACK_PIN_KEY) === '1'
  } catch {
    return false
  }
}

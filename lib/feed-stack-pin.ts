export const FEED_STACK_PIN_KEY = 'margo-feed-stack-pin'
export const MARGO_FEED_STACK_PIN_EVENT = 'margo:feed-stack-pin'

export function pinFeedStackFromFeed() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(FEED_STACK_PIN_KEY, '1')
  } catch {
    /* */
  }
  window.dispatchEvent(new Event(MARGO_FEED_STACK_PIN_EVENT))
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

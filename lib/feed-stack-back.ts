import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { clearFeedStackPin, readFeedStackPinned } from '@/lib/feed-stack-pin'

/** Pop history when a feed exit used the stack overlay — keeps the mounted feed pane. */
export function popFeedStackIfPinned(): boolean {
  if (typeof window === 'undefined') return false
  if (!readFeedStackPinned()) return false
  clearFeedStackPin()
  window.history.back()
  return true
}

export function navigateFeedAwareBack(router: AppRouterInstance, fallbackHref: string): boolean {
  if (popFeedStackIfPinned()) return true
  const dest = fallbackHref.split('?')[0]
  if (dest === '/feed' && typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back()
    return true
  }
  return false
}

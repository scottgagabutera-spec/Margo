import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { FeedContentTab } from '@/lib/feed-content-tab'
import {
  buildFeedResumeHref,
  persistFeedReturnBeforeLeave,
  readFeedReturnSnapshot,
} from '@/lib/margo-feed-return'

/** Save feed tab and scroll, then open a route. Use for every feed block exit. */
export function leaveFeedTo(
  router: AppRouterInstance,
  href: string,
  tab?: FeedContentTab,
) {
  if (typeof window !== 'undefined') {
    persistFeedReturnBeforeLeave(tab)
    const snap = readFeedReturnSnapshot()
    if (snap) {
      try {
        sessionStorage.setItem('margo-feed-return-pending', '1')
      } catch {
        /* */
      }
    }
  }
  router.push(href)
}

export function feedReturnFallbackHref(): string {
  const snap = readFeedReturnSnapshot()
  if (snap?.href && snap.href.startsWith('/feed')) return snap.href
  return buildFeedResumeHref(snap ?? undefined)
}

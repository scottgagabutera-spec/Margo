import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { MouseEvent } from 'react'
import type { FeedContentTab } from '@/lib/feed-content-tab'
import { leaveFeedTo } from '@/lib/feed-exit-nav'

/** One feed exit: save pose, pin keepalive, client navigate (no full reload). */
export function navigateFromFeed(
  router: AppRouterInstance,
  href: string,
  tab: FeedContentTab = 'lyrics',
  event?: MouseEvent,
) {
  event?.preventDefault()
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation()
  }
  leaveFeedTo(router, href, tab)
}

export function memoryPromoHref(kind: 'memory' | 'story' | 'pictures'): string {
  if (kind === 'pictures') return '/memories/new?entry=media'
  if (kind === 'story') return '/memories/new?entry=words&focus=story'
  return '/memories/new'
}

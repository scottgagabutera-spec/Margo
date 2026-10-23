import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import {
  canPopNavStack,
  markNextNavAsReplace,
  navStackPreviousPath,
} from '@/lib/in-app-nav-stack'

export function postThreadHref(postId: string): string {
  return `/post/${encodeURIComponent(postId)}`
}

/**
 * Open a post thread without duplicating history when the target is already
 * the previous in-app step (Back would return here).
 */
export function navigateToPostThread(router: AppRouterInstance, postId: string) {
  const href = postThreadHref(postId)
  if (typeof window === 'undefined') {
    router.push(href)
    return
  }
  const prev = navStackPreviousPath()
  if (prev === href && canPopNavStack()) {
    window.history.back()
    return
  }
  markNextNavAsReplace()
  router.replace(href)
}

/** Chrome Back on /post/* — one step, never re-push parent via Link. */
export function navigatePostThreadBack(
  router: AppRouterInstance,
  fallbackHref: string,
) {
  if (typeof window === 'undefined') {
    router.replace(fallbackHref)
    return
  }
  if (canPopNavStack() && window.history.length > 1) {
    window.history.back()
    return
  }
  markNextNavAsReplace()
  router.replace(fallbackHref)
}

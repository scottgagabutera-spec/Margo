import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { Post } from '@/hooks/usePosts'
import {
  canPopNavStack,
  navStackPreviousPath,
} from '@/lib/in-app-nav-stack'
import { stashPostThreadSeed } from '@/lib/post-thread-seed'
import { signalNavStart } from '@/lib/margo-nav-intent'

export function postThreadHref(postId: string): string {
  return `/post/${encodeURIComponent(postId)}`
}

/**
 * Open a post thread without duplicating history when the target is already
 * the previous in-app step (Back would return here).
 */
export function navigateToPostThread(
  router: AppRouterInstance,
  postId: string,
  seedPost?: Post | null,
) {
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
  if (seedPost?.id === postId) {
    stashPostThreadSeed(postId, seedPost)
  }
  signalNavStart()
  router.push(href)
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
  router.replace(fallbackHref)
}

import { isFeedStackPath } from '@/lib/feed-stack-routes'
import { pinFeedStackFromFeed } from '@/lib/feed-stack-pin'
import { persistFeedReturnBeforeLeave } from '@/lib/margo-feed-return'

function hrefPath(href: string): string {
  try {
    const url = new URL(href, 'https://trymargo.com')
    return url.pathname
  } catch {
    return href.split('?')[0] || ''
  }
}

/** Capture in-feed link taps so the feed pane stays mounted under the destination. */
export function armFeedStackLinkCapture(root: HTMLElement | null) {
  if (!root) return () => {}
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return
    if (event.button !== 0) return
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement)) return
    if (anchor.target === '_blank') return
    const path = hrefPath(anchor.getAttribute('href') || '')
    if (!isFeedStackPath(path)) return
    persistFeedReturnBeforeLeave()
    pinFeedStackFromFeed()
  }
  root.addEventListener('click', onClick, true)
  return () => root.removeEventListener('click', onClick, true)
}

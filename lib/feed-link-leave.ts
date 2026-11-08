import type { FeedContentTab } from '@/lib/feed-content-tab'
import { pinFeedStackFromFeed } from '@/lib/feed-stack-pin'
import { persistFeedReturnBeforeLeave } from '@/lib/margo-feed-return'

/** Call from feed <Link> onClick handlers so the feed pane stays mounted under the route. */
export function armFeedStackLeave(tab?: FeedContentTab) {
  persistFeedReturnBeforeLeave(tab)
  pinFeedStackFromFeed()
}

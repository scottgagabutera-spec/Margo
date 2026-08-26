/**
 * Minimal fields required to resolve a notification tap destination.
 * Kept in lib/ so web UI and future native shells can share routing intent.
 */
export interface NotificationRouteInput {
  type: string
  actor?: { username: string } | null
  postId?: string | null
}

/**
 * Canonical in-app destination for a notification row.
 * Shared routing intent for web (Next.js Link) and future native navigation.
 */
export function notificationHref(n: NotificationRouteInput): string {
  switch (n.type) {
    case 'message':
      return n.actor ? `/messages/${n.actor.username}` : '/messages'
    case 'resonate':
      return n.postId ? `/post/${n.postId}` : '/feed'
    case 'lyric_back':
      return n.postId ? `/post/${n.postId}` : '/feed'
    case 'follow':
    case 'follow_request':
      return n.actor ? `/profile/${n.actor.username}` : '/feed'
    case 'artist_approved':
      return '/studio'
    case 'artist_rejected':
      return '/apply-artist'
    case 'warned':
    case 'frozen':
    case 'removed':
    case 'restored':
      return '/settings'
    default:
      return '/feed'
  }
}

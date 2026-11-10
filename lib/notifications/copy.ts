import type { Notification } from '@/hooks/useNotifications'
import {
  welcomeSeriesBodyFromNotification,
  welcomeSeriesKindFromData,
} from '@/lib/welcome-series/copy'

/** Action phrase only — pair with {@link AuthorMeta} for the actor handle. */
export function notificationActionFor(n: Notification): string {
  switch (n.type) {
    case 'message':
      return 'sent you a message'
    case 'resonate':
      return 'resonated with your lyric'
    case 'lyric_back':
      return 'replied with a Lyric Back'
    case 'memory_reply':
      return 'replied on your memory'
    case 'memory_lyric_reply':
      return 'lyric-backed your memory'
    case 'follow':
      return 'started following you'
    case 'follow_request':
      return 'wants to follow you'
    case 'artist_submitted':
      return `We have your artist application. We review every independent artist by hand, and you will hear from us here in Margo within 3 business days. Thank you for sharing your music with us.`
    case 'artist_approved':
      return `You are approved as an artist on Margo. Studio is open, so you can upload your music now. Post what is true to you.`
    case 'artist_rejected':
      return `We could not approve this application yet. It is not a judgment on your music. You can add at least 3 links to your streaming or social profiles, or verify with Suno, and apply again.`
    case 'warned':
      return `You received a warning on your artist account`
    case 'frozen':
      return `Your artist account was frozen`
    case 'removed':
      return `Your artist status was removed`
    case 'restored':
      return `Your artist account was restored to good standing`
    default:
      return 'sent you an update'
  }
}

export function messageFor(n: Notification): string {
  if (n.type === 'system_welcome') {
    const kind = welcomeSeriesKindFromData(n.data)
    if (kind) {
      return welcomeSeriesBodyFromNotification(kind, n.data as { firstName?: string; body?: string })
    }
    return n.data?.title || 'Tips from Margo'
  }
  const artistOnly: Notification['type'][] = [
    'artist_submitted',
    'artist_approved',
    'artist_rejected',
    'warned',
    'frozen',
    'removed',
    'restored',
  ]
  if (artistOnly.includes(n.type)) {
    return notificationActionFor(n)
  }
  const handle = n.actor?.username ? `@${n.actor.username}` : 'Someone'
  return `${handle} ${notificationActionFor(n)}`
}

import type { Notification } from '@/hooks/useNotifications'

export function messageFor(n: Notification): string {
  const name = n.actor?.displayName || n.actor?.username || 'Someone'
  switch (n.type) {
    case 'message':
      return `${name} sent you a message`
    case 'resonate':
      return `${name} resonated with your lyric`
    case 'lyric_back':
      return `${name} replied with a Lyric Back`
    case 'follow':
      return `${name} started following you`
    case 'follow_request':
      return `${name} wants to follow you`
    case 'artist_approved':
      return `You're approved as an artist on Margo`
    case 'artist_rejected':
      return `Your artist application wasn't approved this time`
    case 'warned':
      return `You received a warning on your artist account`
    case 'frozen':
      return `Your artist account was frozen`
    case 'removed':
      return `Your artist status was removed`
    case 'restored':
      return `Your artist account was restored to good standing`
    default:
      return `${name} did something`
  }
}

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
    case 'memory_reply': {
      const u = n.actor?.username || 'someone'
      return `@${u} replied on your memory`
    }
    case 'memory_lyric_reply': {
      const u = n.actor?.username || 'someone'
      return `@${u} lyric-backed your memory`
    }
    case 'follow':
      return `${name} started following you`
    case 'follow_request':
      return `${name} wants to follow you`
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
      return `${name} did something`
  }
}

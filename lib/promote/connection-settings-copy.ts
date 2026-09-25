import type { SocialConnectionPublic } from '@/lib/promote/types'

/** Publish/API failures stored on connections before — not a "disconnected" signal. */
export function isStalePromoteAttemptError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('/v2/post/publish')
    || m.includes('publish failed')
    || m.includes('publish init')
    || m.includes('chunk upload')
    || m.includes('url_ownership')
    || m.includes('unaudited_client')
  )
}

/**
 * What to show under a platform in Settings (never raw TikTok/YouTube API dumps when still connected).
 */
export function connectionSettingsNotice(connection: SocialConnectionPublic): string | null {
  const { status, lastError } = connection
  if (!lastError?.trim()) return null

  if (status === 'connected' && isStalePromoteAttemptError(lastError)) {
    return 'Connected — a recent Auto-Promote post did not finish. Retry from Studio → Promote (queue shows details).'
  }

  if (status === 'expired' || status === 'error') {
    if (lastError.length > 220) {
      return `${lastError.slice(0, 217)}…`
    }
    return lastError
  }

  if (status === 'connected') {
    return 'Connected — if posting fails, check Studio → Promote for this platform.'
  }

  return null
}

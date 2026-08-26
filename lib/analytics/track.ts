import { track as vercelTrack } from '@vercel/analytics'

/** PR 1 compose/send completion events. */
export type MargoAnalyticsEvent =
  | 'compose_started'
  | 'lyric_selected'
  | 'moment_created'
  | 'moment_posted_public'
  | 'moment_saved_private'
  | 'send_opened'
  | 'moment_sent_dm'
  | 'share_opened'
  | 'moment_shared'
  | 'moment_exported'

export function trackEvent(
  event: MargoAnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === 'undefined') return
  try {
    vercelTrack(event, properties ?? {})
  } catch {
    // Analytics must never block UX.
  }
}

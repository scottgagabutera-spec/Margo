import { track as vercelTrack } from '@vercel/analytics'

/** Phase 3 analytics events. */
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
  | 'moment_opened'
  | 'lyric_back_opened'
  | 'lyric_back_sent'

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

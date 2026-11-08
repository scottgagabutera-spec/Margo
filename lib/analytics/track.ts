import { capturePostHogEvent } from '@/lib/analytics/posthog-browser'
import { track as vercelTrack } from '@vercel/analytics'

/** Phase 3 analytics events. */
export type MargoAnalyticsEvent =
  | 'compose_started'
  | 'lyric_selected'
  | 'moment_created'
  | 'moment_posted_public'
  | 'moment_saved_private'
  | 'moment_story_added_compose'
  | 'send_opened'
  | 'moment_sent_dm'
  | 'share_opened'
  | 'moment_shared'
  | 'moment_exported'
  | 'moment_opened'
  | 'lyric_back_opened'
  | 'lyric_back_sent'
  | 'song_played'
  | 'feed_block_impression'
  | 'feed_block_tap'
  | 'tab_switch_ms'
  | 'return_ok'

export function trackNavMetric(
  event: 'tab_switch_ms' | 'return_ok',
  value: number,
): void {
  trackEvent(event, { value })
}

export function trackEvent(
  event: MargoAnalyticsEvent,
  properties?: Record<string, string | number | boolean | null>,
): void {
  if (typeof window === 'undefined') return
  const props = properties ?? {}
  try {
    vercelTrack(event, props)
  } catch {
    // Analytics must never block UX.
  }
  capturePostHogEvent(event, props)
}

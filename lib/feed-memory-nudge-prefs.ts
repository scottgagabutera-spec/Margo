import type { ProfileSettingsJson } from '@/lib/welcome-profile-settings'

const LOCAL_DISMISS_KEY = 'margo-feed-memory-nudge-dismissed'

type FeedSettings = { memoryNudgeDismissed?: boolean }

export function feedMemoryNudgeDismissedFromSettings(settings: ProfileSettingsJson | null | undefined): boolean {
  const feed = settings?.feed
  if (!feed || typeof feed !== 'object') return false
  return (feed as FeedSettings).memoryNudgeDismissed === true
}

export function mergeFeedMemoryNudgeDismissed(
  settings: ProfileSettingsJson | null | undefined,
  dismissed: boolean,
): ProfileSettingsJson {
  const base = settings && typeof settings === 'object' ? { ...settings } : {}
  const feed =
    base.feed && typeof base.feed === 'object'
      ? { ...(base.feed as Record<string, unknown>) }
      : {}
  if (dismissed) feed.memoryNudgeDismissed = true
  else delete feed.memoryNudgeDismissed
  base.feed = feed
  return base
}

export function localFeedMemoryNudgeDismissed(): boolean {
  try {
    return localStorage.getItem(LOCAL_DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function clearLocalFeedMemoryNudgeDismissed() {
  try {
    localStorage.removeItem(LOCAL_DISMISS_KEY)
  } catch {
    /* ignore */
  }
}

export function shouldShowMemoryNudge(input: {
  signedIn: boolean
  ownMemoryCount: number | null
  dismissed: boolean
}): { show: boolean; reason: string } {
  if (!input.signedIn) return { show: false, reason: 'signed-out' }
  if (input.ownMemoryCount === null) return { show: false, reason: 'count-loading' }
  if (input.dismissed) return { show: false, reason: 'dismissed' }
  if (input.ownMemoryCount > 0) return { show: false, reason: 'has-memories' }
  return { show: true, reason: 'eligible' }
}

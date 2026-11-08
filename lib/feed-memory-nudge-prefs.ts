import type { ProfileSettingsJson } from '@/lib/welcome-profile-settings'
import type { MemoryCardKind } from '@/lib/feed-memory-card'

const LOCAL_DISMISS_KEY = 'margo-feed-memory-nudge-dismissed'
const DISMISS_DAYS = 7

type FeedSettings = {
  memoryNudgeDismissed?: boolean
  memoryCardsHiddenUntil?: string
  lastMemoryCardKind?: MemoryCardKind
}

function feedSettings(settings: ProfileSettingsJson | null | undefined): FeedSettings {
  const feed = settings?.feed
  if (!feed || typeof feed !== 'object') return {}
  return feed as FeedSettings
}

export function feedMemoryCardsHidden(settings: ProfileSettingsJson | null | undefined, now = Date.now()): boolean {
  const until = feedSettings(settings).memoryCardsHiddenUntil
  if (!until) return legacyPermanentDismiss(settings)
  const t = Date.parse(until)
  if (Number.isNaN(t)) return false
  return t > now
}

function legacyPermanentDismiss(settings: ProfileSettingsJson | null | undefined): boolean {
  return feedSettings(settings).memoryNudgeDismissed === true
}

export function feedLastMemoryCardKind(settings: ProfileSettingsJson | null | undefined): MemoryCardKind | null {
  const kind = feedSettings(settings).lastMemoryCardKind
  if (kind === 'media' || kind === 'story' || kind === 'listening' || kind === 'create') return kind
  return null
}

export function mergeFeedMemoryCardsDismiss(
  settings: ProfileSettingsJson | null | undefined,
  now = Date.now(),
): ProfileSettingsJson {
  const until = new Date(now + DISMISS_DAYS * 86400000).toISOString()
  const base = settings && typeof settings === 'object' ? { ...settings } : {}
  const feed =
    base.feed && typeof base.feed === 'object'
      ? { ...(base.feed as Record<string, unknown>) }
      : {}
  feed.memoryCardsHiddenUntil = until
  delete feed.memoryNudgeDismissed
  base.feed = feed
  return base
}

export function mergeFeedLastMemoryCardKind(
  settings: ProfileSettingsJson | null | undefined,
  kind: MemoryCardKind,
): ProfileSettingsJson {
  const base = settings && typeof settings === 'object' ? { ...settings } : {}
  const feed =
    base.feed && typeof base.feed === 'object'
      ? { ...(base.feed as Record<string, unknown>) }
      : {}
  feed.lastMemoryCardKind = kind
  base.feed = feed
  return base
}

/** @deprecated migrates local dismiss into profile settings */
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

export function feedMemoryNudgeDismissedFromSettings(settings: ProfileSettingsJson | null | undefined): boolean {
  return feedMemoryCardsHidden(settings)
}

export function mergeFeedMemoryNudgeDismissed(
  settings: ProfileSettingsJson | null | undefined,
  _dismissed: boolean,
): ProfileSettingsJson {
  return mergeFeedMemoryCardsDismiss(settings)
}

export function shouldShowMemoryCards(input: {
  signedIn: boolean
  ownMemoryCount: number | null
  dismissed: boolean
}): { show: boolean; reason: string } {
  if (!input.signedIn) return { show: false, reason: 'signed-out' }
  if (input.ownMemoryCount === null) return { show: false, reason: 'count-loading' }
  if (input.dismissed) return { show: false, reason: 'dismissed' }
  return { show: true, reason: 'eligible' }
}

/** @deprecated use shouldShowMemoryCards */
export function shouldShowMemoryNudge(input: {
  signedIn: boolean
  ownMemoryCount: number | null
  dismissed: boolean
}): { show: boolean; reason: string } {
  return shouldShowMemoryCards(input)
}

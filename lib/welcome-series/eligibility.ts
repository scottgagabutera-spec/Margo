import type { WelcomeDraftRole } from '../welcome-draft.ts'
import {
  welcomeSeriesFromOnboarding,
  WELCOME_SERIES_VERSION,
  type WelcomeSeriesKind,
} from './kinds.ts'
import {
  WELCOME_NUDGE_DELAY_HOURS,
  effectiveHoursSinceAnchor,
  utcCalendarDay,
} from './time.ts'
import { tipsFromMargoEnabled } from './prefs.ts'
import type { ProfileSettingsJson } from '../welcome-profile-settings.ts'
import { onboardingFromSettings } from '../welcome-profile-settings.ts'

export type WelcomeSeriesActivity = {
  memoryCount: number
  postCount: number
  followingCount: number
  hasArtistApplication: boolean
}

export type PendingWelcomeSend =
  | { kind: WelcomeSeriesKind; flagKey: keyof ReturnType<typeof welcomeSeriesFromOnboarding>; isNudge: boolean }

function onboardingRecord(settings: ProfileSettingsJson | null | undefined): Record<string, unknown> {
  const o = settings?.onboarding
  if (!o || typeof o !== 'object') return {}
  return o as Record<string, unknown>
}

export function isWelcomeSeriesParticipant(settings: ProfileSettingsJson | null | undefined): boolean {
  const flags = welcomeSeriesFromOnboarding(onboardingRecord(settings))
  return flags.welcomeSeriesVersion === WELCOME_SERIES_VERSION && !!flags.welcomeSeriesAnchorAt
}

export function artistGuideEligible(
  settings: ProfileSettingsJson | null | undefined,
  onboardingRole: WelcomeDraftRole | undefined,
): boolean {
  const flags = welcomeSeriesFromOnboarding(onboardingRecord(settings))
  if (flags.artistGuideIntent) return true
  if (onboardingRole === 'artist' || onboardingRole === 'both') return true
  return false
}

export function planWelcomeSeriesSends(input: {
  settings: ProfileSettingsJson | null | undefined
  activity: WelcomeSeriesActivity
  nowMs: number
  devOverrideHours: number | null
  onboardingRole: WelcomeDraftRole | undefined
}): PendingWelcomeSend[] {
  if (!tipsFromMargoEnabled(input.settings)) return []

  const flags = welcomeSeriesFromOnboarding(onboardingRecord(input.settings))
  const onboarding = onboardingFromSettings(input.settings)
  if (flags.welcomeSeriesVersion !== WELCOME_SERIES_VERSION) return []
  if (!flags.welcomeSeriesAnchorAt) return []
  if (!onboarding.completedAt) return []

  const anchor = flags.welcomeSeriesAnchorAt
  const elapsed = effectiveHoursSinceAnchor(anchor, input.nowMs, input.devOverrideHours)
  const today = utcCalendarDay(input.nowMs)
  const out: PendingWelcomeSend[] = []

  if (!flags.welcomeSentAt) {
    out.push({ kind: 'welcome', flagKey: 'welcomeSentAt', isNudge: false })
  }

  const artistOk =
    artistGuideEligible(input.settings, input.onboardingRole)
    && !input.activity.hasArtistApplication
    && !flags.artistGuideSentAt

  if (artistOk && flags.welcomeSentAt) {
    out.push({ kind: 'artist_guide', flagKey: 'artistGuideSentAt', isNudge: false })
  } else if (artistOk && out.some((p) => p.kind === 'welcome')) {
    out.push({ kind: 'artist_guide', flagKey: 'artistGuideSentAt', isNudge: false })
  }

  const nudgeDayBlocked = flags.welcomeSeriesLastNudgeDay === today

  const queueNudge = (kind: 'first_memory' | 'first_lyric' | 'follow_people', sentKey: 'nudgeMemorySentAt' | 'nudgeLyricSentAt' | 'nudgeFollowSentAt') => {
    if (nudgeDayBlocked) return
    const delay = WELCOME_NUDGE_DELAY_HOURS[kind]
    if (elapsed < delay) return
    if (flags[sentKey]) return

    if (kind === 'first_memory' && input.activity.memoryCount > 0) {
      return
    }
    if (kind === 'first_lyric' && input.activity.postCount > 0) {
      return
    }
    if (kind === 'follow_people' && input.activity.followingCount >= 1) {
      return
    }

    if (!flags.welcomeSentAt) return

    out.push({ kind, flagKey: sentKey, isNudge: true })
  }

  queueNudge('first_memory', 'nudgeMemorySentAt')
  queueNudge('first_lyric', 'nudgeLyricSentAt')
  queueNudge('follow_people', 'nudgeFollowSentAt')

  // Max one timed nudge per sync pass / day
  const nudges = out.filter((p) => p.isNudge)
  if (nudges.length > 1) {
    const keep = nudges[0]
    return out.filter((p) => !p.isNudge || p.kind === keep.kind)
  }

  return out
}

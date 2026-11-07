export const WELCOME_SERIES_VERSION = 1 as const

export type WelcomeSeriesKind =
  | 'welcome'
  | 'first_memory'
  | 'first_lyric'
  | 'follow_people'
  | 'artist_guide'

export const WELCOME_SERIES_KINDS: WelcomeSeriesKind[] = [
  'welcome',
  'first_memory',
  'first_lyric',
  'follow_people',
  'artist_guide',
]

export type WelcomeSeriesOnboardingFlags = {
  welcomeSeriesVersion?: number
  welcomeSeriesAnchorAt?: string
  welcomeSentAt?: string
  artistGuideIntent?: boolean
  artistGuideSentAt?: string
  nudgeMemorySentAt?: string
  nudgeLyricSentAt?: string
  nudgeFollowSentAt?: string
  /** ISO date (UTC calendar day) when the last timed nudge was sent — max one nudge per day. */
  welcomeSeriesLastNudgeDay?: string
}

export function welcomeSeriesFromOnboarding(
  onboarding: Record<string, unknown> | undefined,
): WelcomeSeriesOnboardingFlags {
  if (!onboarding || typeof onboarding !== 'object') return {}
  const o = onboarding as WelcomeSeriesOnboardingFlags
  return {
    welcomeSeriesVersion: typeof o.welcomeSeriesVersion === 'number' ? o.welcomeSeriesVersion : undefined,
    welcomeSeriesAnchorAt: typeof o.welcomeSeriesAnchorAt === 'string' ? o.welcomeSeriesAnchorAt : undefined,
    welcomeSentAt: typeof o.welcomeSentAt === 'string' ? o.welcomeSentAt : undefined,
    artistGuideIntent: o.artistGuideIntent === true,
    artistGuideSentAt: typeof o.artistGuideSentAt === 'string' ? o.artistGuideSentAt : undefined,
    nudgeMemorySentAt: typeof o.nudgeMemorySentAt === 'string' ? o.nudgeMemorySentAt : undefined,
    nudgeLyricSentAt: typeof o.nudgeLyricSentAt === 'string' ? o.nudgeLyricSentAt : undefined,
    nudgeFollowSentAt: typeof o.nudgeFollowSentAt === 'string' ? o.nudgeFollowSentAt : undefined,
    welcomeSeriesLastNudgeDay: typeof o.welcomeSeriesLastNudgeDay === 'string'
      ? o.welcomeSeriesLastNudgeDay
      : undefined,
  }
}

import type { ProfileSettingsJson } from '../welcome-profile-settings.ts'
import { WELCOME_SERIES_VERSION, type WelcomeSeriesOnboardingFlags } from './kinds.ts'

export function mergeWelcomeSeriesOnboarding(
  settings: ProfileSettingsJson | null | undefined,
  patch: Partial<WelcomeSeriesOnboardingFlags>,
): ProfileSettingsJson {
  const base = settings && typeof settings === 'object' ? { ...settings } : {}
  const prevOnboarding = base.onboarding && typeof base.onboarding === 'object'
    ? { ...(base.onboarding as Record<string, unknown>) }
    : {}
  const nextOnboarding = { ...prevOnboarding, ...patch }
  base.onboarding = nextOnboarding
  return base
}

/** Stamp eligibility when onboarding completes for the first time on the welcome series build. */
export function stampWelcomeSeriesEligibility(
  settings: ProfileSettingsJson | null | undefined,
  completedAt: string,
  opts: { artistGuideIntent?: boolean },
): ProfileSettingsJson {
  const existing = settings?.onboarding
  const hadVersion =
    existing
    && typeof existing === 'object'
    && (existing as { welcomeSeriesVersion?: number }).welcomeSeriesVersion === WELCOME_SERIES_VERSION

  if (hadVersion) {
    return mergeWelcomeSeriesOnboarding(settings, {})
  }

  return mergeWelcomeSeriesOnboarding(settings, {
    welcomeSeriesVersion: WELCOME_SERIES_VERSION,
    welcomeSeriesAnchorAt: completedAt,
    ...(opts.artistGuideIntent ? { artistGuideIntent: true } : {}),
  })
}

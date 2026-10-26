import type { WelcomeOnboardingProfileContext } from './welcome-needs-onboarding.ts'
import type { ProfileActivitySignals } from './welcome-onboarding-activity.ts'

export function buildPostAuthContext(
  identity: { username: string; displayName: string } | null,
  settings: WelcomeOnboardingProfileContext['settings'],
  profileReadStatus: 'ok' | 'error',
  authUserCreatedAt: string | null | undefined,
  activity?: ProfileActivitySignals,
): WelcomeOnboardingProfileContext {
  return {
    identity,
    settings,
    profileReadOk: profileReadStatus === 'ok',
    authUserCreatedAt,
    activity,
  }
}

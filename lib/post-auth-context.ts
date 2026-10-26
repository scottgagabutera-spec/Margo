import type { WelcomeOnboardingProfileContext } from './welcome-needs-onboarding.ts'

export function buildPostAuthContext(
  identity: { username: string; displayName: string } | null,
  settings: WelcomeOnboardingProfileContext['settings'],
  profileReadStatus: 'ok' | 'error',
  authUserCreatedAt: string | null | undefined,
): WelcomeOnboardingProfileContext {
  return {
    identity,
    settings,
    profileReadOk: profileReadStatus === 'ok',
    authUserCreatedAt,
  }
}

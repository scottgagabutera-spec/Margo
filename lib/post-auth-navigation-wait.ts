import type { Identity } from '@/hooks/useIdentity'
import { sanitizeAuthReturnPath } from '@/lib/auth-return'
import { buildPostAuthContext } from '@/lib/post-auth-context'
import {
  loadWelcomeOnboardingContext,
  fetchAuthUserCreatedAt,
} from '@/lib/resolve-post-auth-destination'
import {
  isAuthUserCreatedAtUnavailable,
  needsOnboarding,
  resolvePostAuthNavigation,
  welcomeOnboardingPath,
} from '@/lib/welcome-needs-onboarding'
import { onboardingFromSettings } from '@/lib/welcome-profile-settings'

export const POST_AUTH_NAV_WAIT_MS = 6000
export const POST_AUTH_NAV_POLL_MS = 80

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type PostAuthWaitOutcome = 'resolved' | 'fail_open_timeout' | 'fail_open_error'

export { buildPostAuthContext } from '@/lib/post-auth-context'

/**
 * Wait for identity + auth created_at + profile settings read before onboarding decision.
 * Fail open to returnTo (or /feed) only on read error or timeout — not while still loading.
 */
export async function resolvePostAuthDestinationWithWait(
  userId: string | undefined,
  waitForIdentity: () => Promise<Identity | null>,
  returnTo?: string | null,
): Promise<{ dest: string; outcome: PostAuthWaitOutcome }> {
  const fallback = sanitizeAuthReturnPath(returnTo) || '/feed'
  if (!userId) {
    return { dest: fallback, outcome: 'fail_open_timeout' }
  }

  const deadline = Date.now() + POST_AUTH_NAV_WAIT_MS
  while (Date.now() < deadline) {
    const [identity, authUserCreatedAt, profileCtx] = await Promise.all([
      waitForIdentity(),
      fetchAuthUserCreatedAt(),
      loadWelcomeOnboardingContext(userId),
    ])

    if (profileCtx.profileReadStatus === 'error') {
      return { dest: fallback, outcome: 'fail_open_error' }
    }

    if (profileCtx.profileReadStatus === 'ok' && identity) {
      if (isAuthUserCreatedAtUnavailable(authUserCreatedAt)) {
        const pendingCtx = buildPostAuthContext(identity, profileCtx.settings, 'ok', null)
        if (needsOnboarding(pendingCtx)) {
          return {
            dest: resolvePostAuthNavigation(pendingCtx, returnTo),
            outcome: 'resolved',
          }
        }
        await sleep(POST_AUTH_NAV_POLL_MS)
        continue
      }

      const dest = resolvePostAuthNavigation(
        buildPostAuthContext(
          identity,
          profileCtx.settings,
          'ok',
          authUserCreatedAt,
        ),
        returnTo,
      )
      return { dest, outcome: 'resolved' }
    }

    if (!identity) {
      await sleep(POST_AUTH_NAV_POLL_MS)
      continue
    }

    await sleep(POST_AUTH_NAV_POLL_MS)
  }

  const lastIdentity = await waitForIdentity()
  const lastProfile = userId ? await loadWelcomeOnboardingContext(userId) : { settings: null, profileReadStatus: 'error' as const }
  if (
    lastIdentity
    && lastProfile.profileReadStatus === 'ok'
    && !onboardingFromSettings(lastProfile.settings).completedAt
  ) {
    return { dest: welcomeOnboardingPath(returnTo), outcome: 'fail_open_timeout' }
  }

  return { dest: fallback, outcome: 'fail_open_timeout' }
}

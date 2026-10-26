import type { Identity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import {
  resolvePostAuthNavigation,
  type WelcomeOnboardingProfileContext,
} from '@/lib/welcome-needs-onboarding'

const supabase = createClient()

export async function fetchAuthUserCreatedAt(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return data.user.created_at ?? null
  } catch {
    return null
  }
}

export async function completeAuthAfterProfileReady(
  userId: string | undefined,
  identity: Identity | null,
  returnTo?: string | null,
  waitForIdentity?: () => Promise<Identity | null>,
): Promise<string> {
  const wait = waitForIdentity ?? (async () => identity)
  const { resolvePostAuthDestinationWithWait } = await import('@/lib/post-auth-navigation-wait')
  const { dest } = await resolvePostAuthDestinationWithWait(userId, wait, returnTo)
  return dest
}

export type ProfileSettingsReadResult = {
  settings: WelcomeOnboardingProfileContext['settings']
  profileReadStatus: 'ok' | 'error'
}

export async function loadWelcomeOnboardingContext(
  userId: string,
): Promise<ProfileSettingsReadResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle()
    if (error) return { settings: null, profileReadStatus: 'error' }
    return {
      settings: (data?.settings as WelcomeOnboardingProfileContext['settings']) ?? null,
      profileReadStatus: 'ok',
    }
  } catch {
    return { settings: null, profileReadStatus: 'error' }
  }
}

export async function resolvePostAuthDestination(
  userId: string | undefined,
  identity: Identity | null,
  authUserCreatedAt: string | null | undefined,
  returnTo?: string | null,
): Promise<string> {
  if (!identity || !userId) {
    return resolvePostAuthNavigation(
      { identity, settings: null, profileReadOk: false, authUserCreatedAt },
      returnTo,
    )
  }
  const { settings, profileReadStatus } = await loadWelcomeOnboardingContext(userId)
  return resolvePostAuthNavigation(
    {
      identity,
      settings,
      profileReadOk: profileReadStatus === 'ok',
      authUserCreatedAt,
    },
    returnTo,
  )
}

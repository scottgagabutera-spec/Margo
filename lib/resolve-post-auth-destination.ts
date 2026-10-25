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
): Promise<string> {
  const authUserCreatedAt = await fetchAuthUserCreatedAt()
  return resolvePostAuthDestination(userId, identity, authUserCreatedAt, returnTo)
}

export async function loadWelcomeOnboardingContext(
  userId: string,
): Promise<Pick<WelcomeOnboardingProfileContext, 'settings' | 'profileReadOk'>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle()
    if (error) return { settings: null, profileReadOk: false }
    return {
      settings: (data?.settings as WelcomeOnboardingProfileContext['settings']) ?? null,
      profileReadOk: true,
    }
  } catch {
    return { settings: null, profileReadOk: false }
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
  const { settings, profileReadOk } = await loadWelcomeOnboardingContext(userId)
  return resolvePostAuthNavigation(
    { identity, settings, profileReadOk, authUserCreatedAt },
    returnTo,
  )
}

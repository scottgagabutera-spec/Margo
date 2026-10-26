import type { Identity } from '@/hooks/useIdentity'
import { activityFromProfileRow } from '@/lib/welcome-onboarding-activity'
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
  identity: WelcomeOnboardingProfileContext['identity']
  activity: WelcomeOnboardingProfileContext['activity']
}

export async function loadWelcomeOnboardingContext(
  userId: string,
): Promise<ProfileSettingsReadResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, display_name, settings, posts_count, followers_count, following_count, avatar_url')
      .eq('id', userId)
      .maybeSingle()
    if (error) return { settings: null, profileReadStatus: 'error', identity: null, activity: undefined }
    return {
      settings: (data?.settings as WelcomeOnboardingProfileContext['settings']) ?? null,
      profileReadStatus: 'ok',
      identity: data
        ? {
            username: data.username as string,
            displayName: (data.display_name as string | null) ?? '',
          }
        : null,
      activity: activityFromProfileRow(data),
    }
  } catch {
    return { settings: null, profileReadStatus: 'error', identity: null, activity: undefined }
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
  const profileCtx = await loadWelcomeOnboardingContext(userId)
  return resolvePostAuthNavigation(
    {
      identity: identity ?? profileCtx.identity,
      settings: profileCtx.settings,
      profileReadOk: profileCtx.profileReadStatus === 'ok',
      authUserCreatedAt,
      activity: profileCtx.activity,
    },
    returnTo,
  )
}

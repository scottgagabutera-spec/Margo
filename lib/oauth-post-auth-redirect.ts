import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { oauthPostExchangeRedirect } from '@/lib/auth-oauth-intent'
import {
  resolvePostAuthNavigation,
  type WelcomeOnboardingProfileContext,
} from '@/lib/welcome-needs-onboarding'

/** Provider-blind post-OAuth path (terms, welcome, or return). */
export async function resolveOAuthPostExchangeRedirect(
  supabase: SupabaseClient,
  user: User,
  needsTerms: boolean,
  oauthReturn: string | null,
): Promise<string> {
  if (needsTerms) {
    return oauthPostExchangeRedirect(true, oauthReturn)
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username, display_name, settings')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return oauthPostExchangeRedirect(false, oauthReturn)
  }

  const ctx: WelcomeOnboardingProfileContext = {
    identity: profile
      ? {
          username: profile.username,
          displayName: (profile.display_name as string | null) ?? '',
        }
      : null,
    settings: (profile?.settings as WelcomeOnboardingProfileContext['settings']) ?? null,
    profileReadOk: true,
    authUserCreatedAt: user.created_at ?? null,
  }

  return resolvePostAuthNavigation(ctx, oauthReturn)
}

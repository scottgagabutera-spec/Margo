'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'
import {
  isWelcomeOnboardingExemptPath,
  needsOnboarding,
  welcomeOnboardingPath,
} from '@/lib/welcome-needs-onboarding'
import { loadWelcomeOnboardingContext } from '@/lib/resolve-post-auth-destination'
import { sanitizeAuthReturnPath } from '@/lib/auth-return'

const SESSION_KEY = 'margo-welcome-enforcer-session'
const supabase = createClient()

/**
 * Once per session, send signed-in members who still need welcome onboarding to /welcome.
 * Fail open on profile read errors. Never runs on exempt auth/legal/welcome paths.
 */
export function WelcomeOnboardingEnforcer() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthGate()
  const { identity, loading: identityLoading } = useIdentity()
  const ranThisLoad = useRef(false)

  useEffect(() => {
    if (authLoading || identityLoading) return
    if (!user?.id || user.is_anonymous) return
    if (isWelcomeOnboardingExemptPath(pathname)) return
    if (ranThisLoad.current) return
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1') return

    ranThisLoad.current = true

    void (async () => {
      const { settings, profileReadOk } = await loadWelcomeOnboardingContext(user.id)
      let authUserCreatedAt: string | null = null
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!error) authUserCreatedAt = data.user?.created_at ?? null
      } catch {
        return
      }

      const returnTo = sanitizeAuthReturnPath(
        `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}`,
      ) || '/feed'

      if (!needsOnboarding({
        identity,
        settings,
        profileReadOk,
        authUserCreatedAt,
      })) {
        return
      }

      try {
        sessionStorage.setItem(SESSION_KEY, '1')
      } catch {
        /* private mode */
      }
      router.replace(welcomeOnboardingPath(returnTo))
    })()
  }, [authLoading, identityLoading, user, identity, pathname, router])

  return null
}

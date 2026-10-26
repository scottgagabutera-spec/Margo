'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import {
  isWelcomeOnboardingExemptPath,
  needsOnboarding,
  welcomeOnboardingPath,
} from '@/lib/welcome-needs-onboarding'
import { loadWelcomeOnboardingContext } from '@/lib/resolve-post-auth-destination'
import { sanitizeAuthReturnPath } from '@/lib/auth-return'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function feedPath(pathname: string | null): boolean {
  return (pathname || '').split('?')[0] === '/feed'
}

/**
 * Hold /feed paint until welcome requirement is ruled out (prevents flash before redirect).
 */
export function PostAuthMountGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthGate()
  const { identity, loading: identityLoading } = useIdentity()
  const onFeed = feedPath(pathname)
  const [feedReady, setFeedReady] = useState(!onFeed)

  useEffect(() => {
    if (!onFeed) {
      setFeedReady(true)
      return
    }
    if (authLoading || identityLoading) return
    if (!user?.id || user.is_anonymous) {
      setFeedReady(true)
      return
    }
    if (isWelcomeOnboardingExemptPath(pathname)) {
      setFeedReady(true)
      return
    }

    setFeedReady(false)
    let cancelled = false
    void (async () => {
      const { settings, profileReadStatus } = await loadWelcomeOnboardingContext(user.id)
      if (cancelled) return
      if (profileReadStatus === 'error') {
        setFeedReady(true)
        return
      }
      let authUserCreatedAt: string | null = null
      try {
        const { data, error } = await supabase.auth.getUser()
        if (!error) authUserCreatedAt = data.user?.created_at ?? null
      } catch {
        setFeedReady(true)
        return
      }

      const returnTo = sanitizeAuthReturnPath(pathname) || '/feed'
      if (needsOnboarding({
        identity,
        settings,
        profileReadOk: true,
        authUserCreatedAt,
      })) {
        router.replace(welcomeOnboardingPath(returnTo))
        return
      }
      setFeedReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [authLoading, identityLoading, user, identity, pathname, router, onFeed])

  if (onFeed && user && !feedReady && !authLoading && !identityLoading) {
    return null
  }

  return <>{children}</>
}

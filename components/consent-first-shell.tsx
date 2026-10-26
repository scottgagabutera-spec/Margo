'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuthGate } from '@/components/supabase-auth-provider'
import {
  consentFirstRedirectHref,
  shouldMountAppContent,
} from '@/lib/consent-first-shell'
import { AUTH_RETURN_QUERY, sanitizeAuthReturnPath } from '@/lib/auth-return'

/**
 * When Margo terms are missing, only /signin?step=terms may mount product chrome and pages.
 */
export function ConsentFirstShell({ children }: { children: ReactNode }) {
  const { user, loading, needsTermsAcceptance } = useAuthGate()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const step = searchParams.get('step')
  const signedIn = !!user && !user.is_anonymous

  const mountContent = shouldMountAppContent({
    signedIn,
    needsTermsAcceptance,
    pathname,
    step,
  })

  useEffect(() => {
    if (loading || !signedIn || !needsTermsAcceptance) return
    if (mountContent) return
    const returnTo = sanitizeAuthReturnPath(searchParams.get(AUTH_RETURN_QUERY))
    router.replace(consentFirstRedirectHref(returnTo))
  }, [loading, signedIn, needsTermsAcceptance, mountContent, router, searchParams])

  if (loading) return null
  if (signedIn && needsTermsAcceptance && !mountContent) {
    return null
  }

  return <>{children}</>
}

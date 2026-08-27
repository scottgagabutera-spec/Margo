'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { LegalConsentGateModal } from '@/components/legal-consent-gate-modal'
import {
  isConsentEnforcementExemptPath,
  isTermsCompletionPage,
} from '@/lib/legal/consent-paths'

/**
 * Client-side consent enforcement: redirect to /signin?step=terms when
 * appropriate, and show a blocking fallback modal if the user reaches the
 * app without recorded Margo consent.
 */
export function LegalConsentEnforcer() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading, needsTermsAcceptance } = useAuthGate()

  const step = searchParams.get('step')
  const onTermsPage = isTermsCompletionPage(pathname, step)

  useEffect(() => {
    if (loading || !user || !needsTermsAcceptance) return
    if (onTermsPage) return
    if (pathname === '/signin') {
      router.replace('/signin?step=terms')
    }
  }, [loading, user, needsTermsAcceptance, onTermsPage, pathname, router])

  if (loading || !user || !needsTermsAcceptance) return null
  if (onTermsPage || isConsentEnforcementExemptPath(pathname)) return null

  return <LegalConsentGateModal />
}

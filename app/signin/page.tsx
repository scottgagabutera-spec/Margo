'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm, TermsCompletionForm, type AuthMode } from '@/components/auth-form'
import { CONSENT_REQUIRED_MESSAGE } from '@/lib/legal/consent-copy'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { completeAuthAfterProfileReady } from '@/lib/auth-welcome-redirect'
import { AUTH_RETURN_QUERY, sanitizeAuthReturnPath } from '@/lib/auth-return'
import { completeAuthNavigation } from '@/lib/auth-complete-navigation'
import { AuthViewportKeyboardInset } from '@/components/auth-viewport'
import { AuthSheetCard } from '@/components/auth-sheet-frame'

function parseMode(value: string | null): AuthMode {
  return value === 'signup' ? 'signup' : 'signin'
}

function parseAuthError(code: string | null): string | null {
  if (code === 'terms') {
    return CONSENT_REQUIRED_MESSAGE
  }
  if (code === 'auth') {
    return 'Sign-in interrupted. Try again.'
  }
  return null
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div className="margo-auth-sheet-page" style={{ background: 'var(--bg)' }} />}>
      <SigninPageInner />
    </Suspense>
  )
}

function SigninPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, needsTermsAcceptance } = useAuthGate()
  const { waitUntilReady, loading: identityLoading } = useIdentity()
  const initialMode = parseMode(searchParams.get('mode'))
  const isTermsStep = searchParams.get('step') === 'terms'
  const showTermsCompletion = isTermsStep || (!loading && !!user && needsTermsAcceptance)
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const returnTo = useMemo(
    () => sanitizeAuthReturnPath(searchParams.get(AUTH_RETURN_QUERY)),
    [searchParams],
  )

  const externalError = useMemo(
    () => parseAuthError(searchParams.get('error')),
    [searchParams],
  )
  const emailConfirmed = searchParams.get('confirmed') === '1'

  const finishAuth = useCallback(async () => {
    const row = await waitUntilReady()
    const dest = await completeAuthAfterProfileReady(user?.id, row, returnTo, waitUntilReady)
    completeAuthNavigation(dest)
  }, [returnTo, waitUntilReady, user?.id])

  useEffect(() => {
    if (loading || identityLoading) return
    if (showTermsCompletion) return
    if (user && !needsTermsAcceptance) {
      void finishAuth()
    }
  }, [loading, identityLoading, user, needsTermsAcceptance, showTermsCompletion, finishAuth])

  const handleClose = useCallback(() => {
    const dest = returnTo || '/'
    router.push(dest)
  }, [returnTo, router])

  return (
    <div className="margo-auth-sheet-page">
      <AuthViewportKeyboardInset />
      <div className="margo-auth-sheet-page__scrim">
        <AuthSheetCard
          onClose={handleClose}
          aria-label={showTermsCompletion ? 'Finish account' : mode === 'signup' ? 'Create account' : 'Sign in'}
        >
          {showTermsCompletion ? (
            <TermsCompletionForm
              externalError={externalError}
              onSuccess={finishAuth}
            />
          ) : (
            <AuthForm
              mode={mode}
              onSwitchMode={setMode}
              externalError={externalError}
              oauthReturnTo={returnTo}
              onSuccess={finishAuth}
              initialShowEmail={emailConfirmed}
              confirmedBanner={emailConfirmed ? 'Email confirmed. Sign in.' : null}
            />
          )}
        </AuthSheetCard>
      </div>
    </div>
  )
}

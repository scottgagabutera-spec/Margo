'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthForm, TermsCompletionForm, type AuthMode } from '@/components/auth-form'
import { CONSENT_REQUIRED_MESSAGE } from '@/lib/legal/consent-copy'
import { BackButton } from '@/components/back-button'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { resolvePostAuthNavigation } from '@/lib/auth-welcome-redirect'
import { AUTH_RETURN_QUERY, sanitizeAuthReturnPath } from '@/lib/auth-return'
import { completeAuthNavigation } from '@/lib/auth-complete-navigation'
import { AuthViewportKeyboardInset } from '@/components/auth-viewport'
import './auth-layout.css'

const lora = 'var(--font-lora), serif'
const ui = 'var(--font-geist-sans), system-ui, sans-serif'

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
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />}>
      <SigninPageInner />
    </Suspense>
  )
}

function SigninPageInner() {
  const searchParams = useSearchParams()
  const { user, loading, needsTermsAcceptance } = useAuthGate()
  const { waitUntilReady } = useIdentity()
  const initialMode = parseMode(searchParams.get('mode'))
  const isTermsStep = searchParams.get('step') === 'terms'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [signupCheckEmail, setSignupCheckEmail] = useState(false)
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
    completeAuthNavigation(resolvePostAuthNavigation(row, returnTo))
  }, [returnTo, waitUntilReady])

  useEffect(() => {
    if (loading) return
    if (user && !needsTermsAcceptance) {
      void finishAuth()
    }
  }, [loading, user, needsTermsAcceptance, finishAuth])

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <AuthViewportKeyboardInset />
      <div className="margo-auth-layout">
        {!signupCheckEmail || isTermsStep ? (
          <div className="margo-auth-layout__back">
            <BackButton variant="chrome" preferHistory={false} fallbackHref={returnTo || '/'} />
          </div>
        ) : (
          <div className="margo-auth-layout__back">
            <BackButton variant="chrome" preferHistory={false} fallbackHref="/signin" />
          </div>
        )}

        <aside className="margo-auth-layout__brand">
          <p style={{
            fontFamily: lora,
            fontStyle: 'italic',
            fontSize: 'clamp(1.6rem, 3vw, 2.1rem)',
            lineHeight: 1.35,
            color: 'var(--text)',
            margin: '0 0 24px',
          }}>
            &ldquo;I have got a thousand lives and I live them all for free&rdquo;
          </p>
          <p style={{
            fontFamily: ui,
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            A Thousand Lives · TryMargo
          </p>
        </aside>

        <div className="margo-auth-layout__panel">
          <main className="margo-auth-layout__main">
            {isTermsStep ? (
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
                onSignupCheckEmailView={setSignupCheckEmail}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

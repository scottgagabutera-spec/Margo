'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm, TermsCompletionForm, type AuthMode } from '@/components/auth-form'
import { AuthModeTabs } from '@/components/auth-mode-tabs'
import { CONSENT_REQUIRED_MESSAGE } from '@/lib/legal/consent-copy'
import { BackButton } from '@/components/back-button'
import MargoLogo from '@/components/MargoLogo'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { AUTH_RETURN_QUERY, sanitizeAuthReturnPath } from '@/lib/auth-return'

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
    return 'Sign-in was interrupted. Please try again.'
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, needsTermsAcceptance } = useAuthGate()
  const initialMode = parseMode(searchParams.get('mode'))
  const isTermsStep = searchParams.get('step') === 'terms'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const returnTo = useMemo(
    () => sanitizeAuthReturnPath(searchParams.get(AUTH_RETURN_QUERY)),
    [searchParams],
  )

  const externalError = useMemo(
    () => parseAuthError(searchParams.get('error')),
    [searchParams],
  )

  const finishAuth = useCallback(() => {
    router.replace(returnTo || '/feed')
  }, [router, returnTo])

  useEffect(() => {
    if (loading) return
    if (user && !needsTermsAcceptance) {
      finishAuth()
    }
  }, [loading, user, needsTermsAcceptance, finishAuth])

  const showModeTabs = !isTermsStep

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div className="margo-auth-layout">
        {showModeTabs ? (
          <div className="margo-auth-layout__toolbar">
            <div className="margo-auth-layout__back">
              <BackButton fallbackHref={returnTo || '/'} />
            </div>
            <div className="margo-auth-layout__tabs margo-auth-layout__tabs-mobile">
              <AuthModeTabs mode={mode} onChange={setMode} />
            </div>
          </div>
        ) : null}

        <aside className="margo-auth-layout__brand">
          <div style={{ marginBottom: '36px' }}>
            <MargoLogo tier="lockup" size={36} rings />
          </div>
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

        <main className="margo-auth-layout__main">
          {isTermsStep ? (
            <TermsCompletionForm
              externalError={externalError}
              onSuccess={finishAuth}
            />
          ) : (
            <>
              <div className="margo-auth-layout__tabs-desktop">
                <AuthModeTabs mode={mode} onChange={setMode} />
              </div>

              <AuthForm
                mode={mode}
                onSwitchMode={setMode}
                externalError={externalError}
                oauthReturnTo={returnTo}
                onSuccess={finishAuth}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

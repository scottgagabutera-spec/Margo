'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm, TermsCompletionForm, type AuthMode } from '@/components/auth-form'
import { AuthModeTabs } from '@/components/auth-mode-tabs'
import { CONSENT_REQUIRED_MESSAGE } from '@/lib/legal/consent-copy'
import { BackButton } from '@/components/back-button'
import MargoLogo from '@/components/MargoLogo'
import { useAuthGate } from '@/components/supabase-auth-provider'

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

  const externalError = useMemo(
    () => parseAuthError(searchParams.get('error')),
    [searchParams],
  )

  useEffect(() => {
    if (loading) return
    if (isTermsStep && user && !needsTermsAcceptance) {
      router.replace('/feed')
    }
  }, [loading, isTermsStep, user, needsTermsAcceptance, router])

  const showModeTabs = !isTermsStep

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style jsx>{`
        .auth-layout {
          flex: 1;
          display: grid;
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          box-sizing: border-box;
          padding:
            max(12px, env(safe-area-inset-top))
            max(16px, env(safe-area-inset-right))
            max(40px, env(safe-area-inset-bottom))
            max(16px, env(safe-area-inset-left));
          gap: clamp(20px, 4vw, 36px);
          align-items: start;
        }

        .auth-layout__toolbar {
          grid-area: toolbar;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          width: 100%;
        }

        .auth-layout__back {
          flex: 0 0 auto;
        }

        .auth-layout__tabs {
          flex: 1 1 auto;
          min-width: 0;
        }

        .auth-layout__brand {
          grid-area: brand;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-right: clamp(16px, 4vw, 40px);
        }

        .auth-layout__main {
          grid-area: main;
          width: 100%;
          min-width: 0;
        }

        .auth-layout__tabs-desktop {
          display: none;
          margin-bottom: 36px;
        }

        @media (max-width: 900px) {
          .auth-layout {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              "toolbar"
              "main";
            padding-top: max(16px, env(safe-area-inset-top));
          }

          .auth-layout__brand {
            display: none;
          }

          .auth-layout__tabs-mobile {
            display: block;
          }

          .auth-layout__tabs-desktop {
            display: none;
          }
        }

        @media (min-width: 901px) {
          .auth-layout {
            grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
            grid-template-areas:
              "toolbar toolbar"
              "brand main";
            padding-top: max(24px, env(safe-area-inset-top));
          }

          .auth-layout__tabs-mobile {
            display: none;
          }

          .auth-layout__tabs-desktop {
            display: block;
          }
        }
      `}</style>

      <div className="auth-layout">
        {showModeTabs ? (
          <div className="auth-layout__toolbar">
            <div className="auth-layout__back">
              <BackButton fallbackHref="/" />
            </div>
            <div className="auth-layout__tabs auth-layout__tabs-mobile">
              <AuthModeTabs mode={mode} onChange={setMode} />
            </div>
          </div>
        ) : null}

        <aside className="auth-layout__brand">
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

        <main className="auth-layout__main">
          {isTermsStep ? (
            <TermsCompletionForm
              externalError={externalError}
              onSuccess={() => router.push('/feed')}
            />
          ) : (
            <>
              <div className="auth-layout__tabs-desktop">
                <AuthModeTabs mode={mode} onChange={setMode} />
              </div>

              <AuthForm
                mode={mode}
                onSwitchMode={setMode}
                externalError={externalError}
                onSuccess={() => router.push('/feed')}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

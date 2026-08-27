'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm, TermsCompletionForm, type AuthMode } from '@/components/auth-form'
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
    return 'Please agree to the Terms of Service and Privacy Policy before creating an account.'
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

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {!isTermsStep ? (
        <div style={{
          position: 'fixed',
          top: 'max(16px, env(safe-area-inset-top))',
          left: 'max(16px, env(safe-area-inset-left))',
          zIndex: 60,
        }}>
          <BackButton fallbackHref="/" />
        </div>
      ) : null}

      <style jsx>{`
        .auth-shell {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 400px);
          gap: clamp(32px, 6vw, 80px);
          align-items: center;
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: max(48px, env(safe-area-inset-top)) clamp(24px, 5vw, 48px) max(40px, env(safe-area-inset-bottom));
          box-sizing: border-box;
        }
        .auth-brand {
          display: flex;
        }
        @media (max-width: 900px) {
          .auth-shell {
            grid-template-columns: 1fr;
            max-width: 420px;
            padding-top: max(72px, calc(env(safe-area-inset-top) + 48px));
          }
          .auth-brand {
            display: none;
          }
        }
      `}</style>

      <div className="auth-shell">
        <aside
          className="auth-brand"
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 'clamp(16px, 4vw, 40px)',
          }}
        >
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

        <main style={{ width: '100%' }}>
          {isTermsStep ? (
            <TermsCompletionForm
              externalError={externalError}
              onSuccess={() => router.push('/feed')}
            />
          ) : (
            <>
              <div
                role="tablist"
                aria-label="Authentication mode"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  padding: '3px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: '36px',
                }}
              >
                {(['signin', 'signup'] as const).map((tab) => {
                  const active = mode === tab
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setMode(tab)}
                      style={{
                        height: '36px',
                        borderRadius: '9px',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: ui,
                        fontSize: '0.76rem',
                        fontWeight: active ? 600 : 500,
                        color: active ? 'var(--text-on-gold, var(--bg))' : 'var(--text-secondary)',
                        background: active ? 'var(--gold)' : 'transparent',
                        transition: 'background 150ms ease, color 150ms ease',
                      }}
                    >
                      {tab === 'signin' ? 'Sign in' : 'Create account'}
                    </button>
                  )
                })}
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

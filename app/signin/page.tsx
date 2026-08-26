'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm, type AuthMode } from '@/components/auth-form'
import { BackButton } from '@/components/back-button'
import MargoLogo from '@/components/MargoLogo'

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
  const initialMode = parseMode(searchParams.get('mode'))
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const externalError = useMemo(
    () => parseAuthError(searchParams.get('error')),
    [searchParams],
  )

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed',
        top: 'calc(var(--nav-height, 72px) + 8px)',
        left: 'max(16px, env(safe-area-inset-left))',
        zIndex: 60,
      }}>
        <BackButton fallbackHref="/" />
      </div>

      <style jsx>{`
        .auth-shell {
          min-height: 100dvh;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 480px);
          gap: 0;
        }
        .auth-brand {
          display: flex;
        }
        .auth-panel {
          display: flex;
        }
        @media (max-width: 900px) {
          .auth-shell {
            grid-template-columns: 1fr;
          }
          .auth-brand {
            display: none;
          }
          .auth-panel {
            padding-top: calc(var(--nav-height, 72px) + 12px);
          }
        }
      `}</style>

      <div className="auth-shell">
        <aside
          className="auth-brand"
          style={{
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(32px, 6vw, 72px)',
            background: 'linear-gradient(165deg, rgba(232,197,71,0.07), transparent 58%)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div style={{
            position: 'absolute',
            top: '18%',
            left: '8%',
            width: 'min(360px, 40vw)',
            height: 'min(360px, 40vw)',
            background: 'rgba(232,197,71,0.07)',
            borderRadius: '50%',
            filter: 'blur(90px)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', maxWidth: '460px' }}>
            <div style={{ marginBottom: '28px' }}>
              <MargoLogo tier="lockup" size={40} rings />
            </div>
            <p style={{
              fontFamily: lora,
              fontStyle: 'italic',
              fontSize: 'clamp(1.75rem, 3.6vw, 2.35rem)',
              lineHeight: 1.35,
              color: 'var(--text)',
              marginBottom: '20px',
            }}>
              &ldquo;I have got a thousand lives and I live them all for free&rdquo;
            </p>
            <p style={{
              fontFamily: ui,
              fontSize: '0.72rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '28px',
            }}>
              A Thousand Lives · TryMargo
            </p>
            <p style={{
              fontFamily: ui,
              fontSize: '0.95rem',
              color: 'var(--text-2)',
              lineHeight: 1.65,
              margin: 0,
            }}>
              Communicate through music lyric. Share the words that move you, and find the people who feel the same way.
            </p>
          </div>
        </aside>

        <main
          className="auth-panel"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(88px, 12vw, 108px) clamp(20px, 4vw, 40px) clamp(28px, 5vw, 48px)',
            paddingLeft: 'max(20px, env(safe-area-inset-left))',
            paddingRight: 'max(20px, env(safe-area-inset-right))',
            paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          }}
        >
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div
              role="tablist"
              aria-label="Authentication mode"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '4px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                marginBottom: '28px',
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
                      minHeight: 'var(--margo-touch-min)',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: ui,
                      fontSize: '0.8rem',
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

            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: 'clamp(22px, 4vw, 32px)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
              }}
            >
              <AuthForm
                mode={mode}
                onSwitchMode={setMode}
                externalError={externalError}
                onSuccess={() => router.push('/feed')}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

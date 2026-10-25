'use client'

import { Suspense, useEffect, useId, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import MargoLogo from '@/components/MargoLogo'
import { LoadingRing } from '@/components/loading-ring'
import {
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_PASSWORD_MIN_MESSAGE,
} from '@/lib/auth-password-policy'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'
import { TYPE, UI_FONT } from '@/lib/fonts'
import '../signin/auth-layout.css'

const ui = UI_FONT

function ResetPasswordInner() {
  const passwordId = useId()
  const [ready, setReady] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const recoveryRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    const supabase = createRecoveryClient()
    recoveryRef.current = supabase
    void (async () => {
      const { data } = await supabase.auth.getSession()
      setHasRecoverySession(!!data.session)
      setReady(true)
    })()
  }, [])

  const handleSubmit = async () => {
    if (busy || !hasRecoverySession) return
    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      setError(AUTH_PASSWORD_MIN_MESSAGE)
      return
    }
    setBusy(true)
    setError('')
    try {
      const supabase = recoveryRef.current ?? createRecoveryClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError('Could not update password. Request a new link and try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Could not update password. Request a new link and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div className="margo-auth-layout">
        <div className="margo-auth-layout__back">
          <BackButton variant="chrome" preferHistory={false} fallbackHref="/signin" />
        </div>

        <div className="margo-auth-layout__panel">
          <div className="margo-auth-layout__intro">
            <div className="margo-auth-layout__mark">
              <MargoLogo tier="lockup" size={32} rings />
            </div>
          </div>

          <main className="margo-auth-layout__main" data-margo-auth-screen="reset-password">
            {!ready ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <LoadingRing size={32} strokeWidth={2} state="spinning" />
              </div>
            ) : done ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 14px',
                }}>
                  Password updated
                </h1>
                <Link
                  href="/signin"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    padding: '0 24px',
                    background: 'var(--gold)',
                    color: 'var(--text-on-gold, var(--bg))',
                    borderRadius: '50px',
                    fontFamily: ui,
                    fontWeight: 600,
                    fontSize: TYPE.meta,
                    textDecoration: 'none',
                  }}
                >
                  Sign in
                </Link>
              </div>
            ) : !hasRecoverySession ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 14px',
                }}>
                  Reset link needed
                </h1>
                <p style={{
                  fontFamily: ui,
                  fontSize: TYPE.secondary,
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  margin: '0 0 20px',
                }}>
                  Open the link from your email, or request a new one.
                </p>
                <Link
                  href="/forgot-password"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '44px',
                    padding: '0 24px',
                    background: 'var(--gold)',
                    color: 'var(--text-on-gold, var(--bg))',
                    borderRadius: '50px',
                    fontFamily: ui,
                    fontWeight: 600,
                    fontSize: TYPE.meta,
                    textDecoration: 'none',
                  }}
                >
                  Forgot password
                </Link>
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <header style={{ marginBottom: '28px', textAlign: 'center' }}>
                  <h1 style={{
                    fontFamily: ui,
                    fontSize: TYPE.pageTitle,
                    color: 'var(--text)',
                    fontWeight: 600,
                    margin: 0,
                  }}>
                    Choose a new password
                  </h1>
                </header>

                {error ? (
                  <p role="alert" style={{
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    color: 'var(--text-secondary)',
                    margin: '0 0 16px',
                    lineHeight: 1.45,
                  }}>
                    {error}
                  </p>
                ) : null}

                <div style={{ marginBottom: '16px' }}>
                  <label
                    htmlFor={passwordId}
                    style={{
                      display: 'block',
                      fontFamily: ui,
                      fontSize: TYPE.label,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      marginBottom: '8px',
                      fontWeight: 700,
                    }}
                  >
                    New password
                  </label>
                  <input
                    id={passwordId}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    disabled={busy}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
                    style={{
                      width: '100%',
                      height: '44px',
                      padding: '0 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      fontFamily: ui,
                      fontSize: TYPE.body,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => { void handleSubmit() }}
                  disabled={busy || password.length < AUTH_PASSWORD_MIN_LENGTH}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    background: 'var(--gold)',
                    color: 'var(--text-on-gold, var(--bg))',
                    border: 'none',
                    borderRadius: '50px',
                    fontFamily: ui,
                    fontWeight: 600,
                    fontSize: TYPE.meta,
                    cursor: busy || password.length < AUTH_PASSWORD_MIN_LENGTH ? 'not-allowed' : 'pointer',
                    opacity: busy || password.length < AUTH_PASSWORD_MIN_LENGTH ? 0.55 : 1,
                  }}
                >
                  {busy ? (
                    <LoadingRing size={18} strokeWidth={1.5} state="spinning" color="var(--bg)" />
                  ) : 'Save password'}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />}>
      <ResetPasswordInner />
    </Suspense>
  )
}

'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import MargoLogo from '@/components/MargoLogo'
import { LoadingRing } from '@/components/loading-ring'
import { parsePasswordErrorMessage, validatePassword } from '@/lib/auth-password-policy'
import { AuthPasswordField } from '@/components/auth-password-field'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { AuthScreenHelp } from '@/components/auth-screen-help'
import { AuthViewportKeyboardInset } from '@/components/auth-viewport'
import '../signin/auth-layout.css'

const ui = UI_FONT

function ResetPasswordInner() {
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
    const pwCheck = validatePassword(password)
    if (!pwCheck.ok) {
      setError(pwCheck.message)
      return
    }
    setBusy(true)
    setError('')
    try {
      const supabase = recoveryRef.current ?? createRecoveryClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(parsePasswordErrorMessage(updateError.message))
        return
      }
      setDone(true)
    } catch {
      setError('Could not update. Request a new link.')
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
      <AuthViewportKeyboardInset />
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
                  Use the email link, or request another.
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
                    New password
                  </h1>
                </header>

                <AuthPasswordField
                  value={password}
                  disabled={busy}
                  autoComplete="new-password"
                  error={error || null}
                  onChange={(v) => { setPassword(v); setError('') }}
                  onEnter={() => { void handleSubmit() }}
                />

                <button
                  type="button"
                  onClick={() => { void handleSubmit() }}
                  disabled={busy || !validatePassword(password).ok}
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
                    cursor: busy || !validatePassword(password).ok ? 'not-allowed' : 'pointer',
                    opacity: busy || !validatePassword(password).ok ? 0.55 : 1,
                  }}
                >
                  {busy ? (
                    <LoadingRing size={18} strokeWidth={1.5} state="spinning" color="var(--bg)" />
                  ) : 'Save password'}
                </button>
              </div>
            )}
          </main>
          <AuthScreenHelp />
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

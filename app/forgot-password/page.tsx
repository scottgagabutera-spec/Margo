'use client'

import { useId, useState } from 'react'
import { BackButton } from '@/components/back-button'
import { AuthSuccessIcon } from '@/components/auth-success-icon'
import { stashResetRequestEmail } from '@/lib/auth-recovery-email-prefill'
import { LoadingRing } from '@/components/loading-ring'
import { createClient } from '@/lib/supabase/client'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { AuthViewportKeyboardInset, scrollAuthFieldIntoView } from '@/components/auth-viewport'
import { resolveAuthEmailRedirectOriginFromHost, resetPasswordRedirectUrl } from '@/lib/auth-email-redirect'
import '../signin/auth-layout.css'

const ui = UI_FONT

export default function ForgotPasswordPage() {
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (busy) return
    const trimmed = email.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      const supabase = createClient()
      const redirectTo =
        typeof window !== 'undefined'
          ? resetPasswordRedirectUrl(
            resolveAuthEmailRedirectOriginFromHost(window.location.host, window.location.protocol.replace(':', '')),
          )
          : undefined
      await supabase.auth.resetPasswordForEmail(trimmed, redirectTo ? { redirectTo } : undefined)
      stashResetRequestEmail(trimmed)
    } catch {
      // same neutral outcome — no account enumeration
    } finally {
      setBusy(false)
      setSubmitted(true)
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
          <main className="margo-auth-layout__main" data-margo-auth-screen="forgot-password">
            {submitted ? (
              <div style={{ width: '100%' }} data-margo-auth-check-email="reset">
                <AuthSuccessIcon />
                <header style={{ textAlign: 'center' }}>
                  <h1 style={{
                    fontFamily: ui,
                    fontSize: TYPE.pageTitle,
                    color: 'var(--text)',
                    fontWeight: 600,
                    margin: '0 0 14px',
                  }}>
                    Check email
                  </h1>
                  <p style={{
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    lineHeight: 1.5,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    wordBreak: 'break-word',
                  }}>
                    If that email has an account, we sent a code.
                  </p>
                </header>
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
                    Reset password
                  </h1>
                  <p style={{
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    lineHeight: 1.45,
                    color: 'var(--text-secondary)',
                    margin: '14px 0 0',
                  }}>
                    Email used for your account.
                  </p>
                </header>

                <div style={{ marginBottom: '16px' }}>
                  <label
                    htmlFor={emailId}
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
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    autoComplete="email"
                    value={email}
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={(e) => scrollAuthFieldIntoView(e.currentTarget)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
                    className="margo-auth-input"
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
                  disabled={busy || !email.trim()}
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
                    cursor: busy || !email.trim() ? 'not-allowed' : 'pointer',
                    opacity: busy || !email.trim() ? 0.55 : 1,
                  }}
                >
                  {busy ? (
                    <LoadingRing size={18} strokeWidth={1.5} state="spinning" color="var(--bg)" />
                  ) : 'Send code'}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

'use client'

import { Suspense, useCallback, useEffect, useId, useRef, useState } from 'react'
import type { EmailOtpType } from '@supabase/supabase-js'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { AuthSuccessIcon } from '@/components/auth-success-icon'
import { LoadingRing } from '@/components/loading-ring'
import { parsePasswordErrorMessage } from '@/lib/auth-password-policy'
import { canSavePasswordPair, PASSWORD_MISMATCH_MESSAGE, validatePasswordPair } from '@/lib/auth-password-confirm'
import { validatePassword } from '@/lib/auth-password-policy'
import { consumeResetRequestEmail } from '@/lib/auth-recovery-email-prefill'
import { AuthPasswordField } from '@/components/auth-password-field'
import { AuthRecoveryCodeInput, RECOVERY_CODE_LENGTH } from '@/components/auth-recovery-code-input'
import { createRecoveryClient } from '@/lib/supabase/recovery-client'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { AuthViewportKeyboardInset, scrollAuthFieldIntoView } from '@/components/auth-viewport'
import {
  classifyRecoveryUrlError,
  classifyVerifyOtpError,
  recoveryUrlErrorMessage,
  recoveryVerifyErrorMessage,
  RECOVERY_RESEND_NEUTRAL_MESSAGE,
  resolveInitialRecoveryPhase,
  type RecoveryFlowPhase,
} from '@/lib/auth-recovery-errors'
import {
  mergeAuthCallbackParams,
  stripAuthSecretsFromBrowserUrl,
} from '@/lib/auth-recovery-url'
import {
  resolveAuthEmailRedirectOriginFromHost,
  resetPasswordRedirectUrl,
} from '@/lib/auth-email-redirect'
import { createClient } from '@/lib/supabase/client'
import '../signin/auth-layout.css'

const ui = UI_FONT
const RESEND_COOLDOWN_MS = 60_000

const primaryBtn: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  background: 'var(--gold)',
  color: 'var(--text-on-gold, var(--bg))',
  border: 'none',
  borderRadius: '50px',
  fontFamily: ui,
  fontWeight: 600,
  fontSize: TYPE.meta,
  cursor: 'pointer',
}

function ResetPasswordInner() {
  const emailId = useId()
  const [phase, setPhase] = useState<RecoveryFlowPhase>('loading')
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [urlErrorLine, setUrlErrorLine] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [resendBusy, setResendBusy] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0)
  const recoveryRef = useRef(createRecoveryClient())

  useEffect(() => {
    if (resendCooldownUntil <= Date.now()) return
    const t = setTimeout(() => setResendCooldownUntil(0), resendCooldownUntil - Date.now())
    return () => clearTimeout(t)
  }, [resendCooldownUntil])

  useEffect(() => {
    const params = mergeAuthCallbackParams(window.location.search, window.location.hash)
    const urlKind = (params.error || params.error_code || params.error_description)
      ? classifyRecoveryUrlError(params.error, params.error_code, params.error_description)
      : null
    const hash = params.token_hash
    stripAuthSecretsFromBrowserUrl()

    if (urlKind) {
      setUrlErrorLine(recoveryUrlErrorMessage(urlKind))
      setPhase('url_error')
      return
    }

    setTokenHash(hash)
    const prefilled = consumeResetRequestEmail()
    if (prefilled) setEmail(prefilled)
    setPhase(resolveInitialRecoveryPhase({ urlErrorKind: null }))
  }, [])

  const verifyFailed = useCallback((message: string) => {
    setFieldError(message)
  }, [])

  const verifyWithHash = async () => {
    if (busy || !tokenHash) return
    setBusy(true)
    setFieldError('')
    try {
      const supabase = recoveryRef.current
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery' as EmailOtpType,
      })
      if (error) {
        verifyFailed(recoveryVerifyErrorMessage(classifyVerifyOtpError(error)))
        return
      }
      setPhase('password')
    } catch {
      verifyFailed('Could not verify. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const verifyWithCode = async () => {
    if (busy) return
    const trimmedEmail = email.trim()
    const token = code.replace(/\D/g, '')
    if (!trimmedEmail || token.length !== RECOVERY_CODE_LENGTH) return
    setBusy(true)
    setFieldError('')
    try {
      const supabase = recoveryRef.current
      const { error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: 'recovery' as EmailOtpType,
      })
      if (error) {
        verifyFailed(recoveryVerifyErrorMessage(classifyVerifyOtpError(error)))
        return
      }
      setPhase('password')
    } catch {
      verifyFailed('Could not verify. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handlePasswordSave = async () => {
    if (busy || phase !== 'password') return
    const pwCheck = validatePasswordPair(password, confirmPassword)
    if (!pwCheck.ok) {
      if (pwCheck.field === 'confirm') {
        setConfirmError(pwCheck.message)
        setFieldError('')
      } else {
        setFieldError(pwCheck.message)
        setConfirmError('')
      }
      return
    }
    setBusy(true)
    setFieldError('')
    setConfirmError('')
    try {
      const { error: updateError } = await recoveryRef.current.auth.updateUser({ password })
      if (updateError) {
        setFieldError(parsePasswordErrorMessage(updateError.message))
        return
      }
      setPhase('done')
    } catch {
      setFieldError('Could not update. Request a new link.')
    } finally {
      setBusy(false)
    }
  }

  const resendReset = async () => {
    const trimmed = email.trim()
    if (!trimmed || resendBusy || resendCooldownUntil > Date.now()) return
    setResendBusy(true)
    setResendStatus(null)
    try {
      const supabase = createClient()
      const redirectTo = resetPasswordRedirectUrl(
        resolveAuthEmailRedirectOriginFromHost(
          window.location.host,
          window.location.protocol.replace(':', ''),
        ),
      )
      await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo })
    } catch {
      // neutral
    } finally {
      setResendBusy(false)
      setResendStatus(RECOVERY_RESEND_NEUTRAL_MESSAGE)
      setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
    }
  }

  const resendCooldownActive = resendCooldownUntil > Date.now()
  const screenState = phase === 'loading' ? 'loading' : phase

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
          <main
            className="margo-auth-layout__main"
            data-margo-auth-screen="reset-password"
            data-margo-reset-state={screenState}
          >
            {phase === 'loading' ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <LoadingRing size={32} strokeWidth={2} state="spinning" />
              </div>
            ) : phase === 'done' ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <AuthSuccessIcon />
                <h1 style={{
                  fontFamily: ui,
                  fontSize: TYPE.pageTitle,
                  color: 'var(--text)',
                  fontWeight: 600,
                  margin: '0 0 14px',
                }}>
                  Password updated
                </h1>
                <Link href="/signin" style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'auto', padding: '0 24px', textDecoration: 'none' }}>
                  Sign in
                </Link>
              </div>
            ) : phase === 'url_error' ? (
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
                {urlErrorLine ? (
                  <p role="alert" style={{
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    lineHeight: 1.45,
                    color: 'var(--text-secondary)',
                    margin: '0 0 20px',
                  }}>
                    {urlErrorLine}
                  </p>
                ) : null}
                <Link href="/forgot-password" style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  Request a new link
                </Link>
              </div>
            ) : phase === 'continue' ? (
              <div style={{ width: '100%' }}>
                <header style={{ marginBottom: '24px', textAlign: 'center' }}>
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
                    Tap continue to verify this link.
                  </p>
                </header>
                {fieldError ? (
                  <p role="alert" style={{
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    color: 'var(--danger, #e88)',
                    margin: '0 0 16px',
                    textAlign: 'center',
                  }}>
                    {fieldError}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-margo-reset-continue
                  disabled={busy}
                  onClick={() => { void verifyWithHash() }}
                  style={{
                    ...primaryBtn,
                    opacity: busy ? 0.55 : 1,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    marginBottom: '16px',
                  }}
                >
                  {busy ? (
                    <LoadingRing size={18} strokeWidth={1.5} state="spinning" color="var(--bg)" />
                  ) : 'Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => { setFieldError(''); setPhase('code') }}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    color: 'var(--gold)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Enter code instead
                </button>
              </div>
            ) : phase === 'code' ? (
              <div style={{ width: '100%' }}>
                <header style={{ marginBottom: '22px', textAlign: 'center' }}>
                  <h1 style={{
                    fontFamily: ui,
                    fontSize: TYPE.pageTitle,
                    color: 'var(--text)',
                    fontWeight: 600,
                    margin: 0,
                  }}>
                    Enter code
                  </h1>
                  <p style={{
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    lineHeight: 1.45,
                    color: 'var(--text-secondary)',
                    margin: '14px 0 0',
                  }}>
                    8-digit code from your email.
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
                    onChange={(e) => { setEmail(e.target.value); setFieldError('') }}
                    onFocus={(e) => scrollAuthFieldIntoView(e.currentTarget)}
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

                <div style={{ marginBottom: '16px' }}>
                  <AuthRecoveryCodeInput
                    value={code}
                    disabled={busy}
                    error={fieldError || null}
                    onChange={(v) => { setCode(v); setFieldError('') }}
                  />
                </div>

                <button
                  type="button"
                  data-margo-reset-verify-code
                  disabled={busy || !email.trim() || code.replace(/\D/g, '').length !== RECOVERY_CODE_LENGTH}
                  onClick={() => { void verifyWithCode() }}
                  style={{
                    ...primaryBtn,
                    opacity: busy || !email.trim() || code.replace(/\D/g, '').length !== RECOVERY_CODE_LENGTH ? 0.55 : 1,
                    cursor: busy ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                  }}
                >
                  {busy ? (
                    <LoadingRing size={18} strokeWidth={1.5} state="spinning" color="var(--bg)" />
                  ) : 'Verify code'}
                </button>

                <button
                  type="button"
                  disabled={resendCooldownActive || resendBusy || !email.trim()}
                  onClick={() => { void resendReset() }}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    color: resendCooldownActive ? 'var(--text-muted)' : 'var(--gold)',
                    fontWeight: 600,
                    cursor: resendCooldownActive || resendBusy || !email.trim() ? 'not-allowed' : 'pointer',
                    opacity: resendCooldownActive ? 0.55 : 1,
                    marginBottom: '8px',
                  }}
                >
                  {resendBusy ? 'Sending…' : resendCooldownActive ? 'Resend in 1 min' : 'Resend reset email'}
                </button>
                {resendStatus ? (
                  <p style={{
                    fontFamily: ui,
                    fontSize: TYPE.secondary,
                    color: 'var(--text-secondary)',
                    margin: '0 0 12px',
                    lineHeight: 1.45,
                  }}>
                    {resendStatus}
                  </p>
                ) : null}
                {tokenHash ? (
                  <button
                    type="button"
                    onClick={() => { setFieldError(''); setPhase('continue') }}
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      background: 'transparent',
                      border: 'none',
                      fontFamily: ui,
                      fontSize: TYPE.secondary,
                      color: 'var(--gold)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Use email link instead
                  </button>
                ) : (
                  <Link
                    href="/forgot-password"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '44px',
                      fontFamily: ui,
                      fontSize: TYPE.secondary,
                      color: 'var(--gold)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Request a new link
                  </Link>
                )}
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
                  label="New password"
                  value={password}
                  disabled={busy}
                  autoComplete="new-password"
                  error={fieldError || null}
                  showMeter
                  showRequirements
                  onChange={(v) => { setPassword(v); setFieldError(''); setConfirmError('') }}
                  onEnter={() => { void handlePasswordSave() }}
                />

                <div style={{ marginTop: '16px' }} data-margo-reset-confirm-password>
                  <AuthPasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    disabled={busy}
                    autoComplete="new-password"
                    showRequirements={false}
                    showMeter={false}
                    matchOk={
                      confirmPassword.length > 0
                      && password === confirmPassword
                      && validatePassword(password).ok
                      && !confirmError
                    }
                    error={confirmError || null}
                    onChange={(v) => {
                      setConfirmPassword(v)
                      setConfirmError('')
                      if (v && password !== v && validatePassword(password).ok) {
                        setConfirmError(PASSWORD_MISMATCH_MESSAGE)
                      }
                    }}
                    onEnter={() => { void handlePasswordSave() }}
                  />
                </div>

                <button
                  type="button"
                  data-margo-reset-save
                  onClick={() => { void handlePasswordSave() }}
                  disabled={busy || !canSavePasswordPair(password, confirmPassword)}
                  style={{
                    ...primaryBtn,
                    marginTop: '16px',
                    opacity: busy || !canSavePasswordPair(password, confirmPassword) ? 0.55 : 1,
                    cursor: busy || !canSavePasswordPair(password, confirmPassword) ? 'not-allowed' : 'pointer',
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

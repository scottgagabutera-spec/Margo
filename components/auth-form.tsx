'use client'

import { useEffect, useId, useState } from 'react'
import { toast } from 'sonner'
import { completeAuthNavigation } from '@/lib/auth-complete-navigation'
import { resolvePostAuthNavigation } from '@/lib/auth-welcome-redirect'
import {
  parsePasswordErrorMessage,
  validatePassword,
} from '@/lib/auth-password-policy'
import { AuthPasswordField } from '@/components/auth-password-field'
import Link from 'next/link'
import { AuthSuccessIcon } from '@/components/auth-success-icon'
import { createClient } from '@/lib/supabase/client'
import { setBrowserAccessToken } from '@/lib/supabase/client'
import {
  RESEND_CONFIRM_NEUTRAL_MESSAGE,
  SIGN_IN_NEUTRAL_MESSAGE,
} from '@/lib/auth-login-errors'
import { scrollAuthFieldIntoView } from '@/components/auth-viewport'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import {
  CONSENT_REQUIRED_MESSAGE,
  CONSENT_REQUIRED_SHORT,
  ConsentRequiredAlert,
  SignupConsentCheckbox,
  SignupConsentGate,
  TermsCompletionIntro,
} from '@/components/signup-legal-notice'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { LoadingRing } from '@/components/loading-ring'

const ui = UI_FONT
const RESEND_COOLDOWN_MS = 60_000

export type AuthMode = 'signup' | 'signin'

interface AuthFormProps {
  mode: AuthMode
  onSuccess?: () => void
  onSwitchMode?: (mode: AuthMode) => void
  externalError?: string | null
  /** Post-OAuth redirect path (e.g. /compose) — set by auth gate. */
  oauthReturnTo?: string | null
  /** Sign-in page owns Sign in / Create account as tabs — skip the duplicate h1. */
  hideTitle?: boolean
  /** Open the email form on first paint (e.g. after email confirm link). */
  initialShowEmail?: boolean
  /** One line under tabs when email was confirmed. */
  confirmedBanner?: string | null
  /** Sign-up “check email” view — hide tabs in parent. */
  onSignupCheckEmailView?: (active: boolean) => void
}

interface TermsCompletionFormProps {
  onSuccess?: () => void
  externalError?: string | null
}

function friendlyError(e: { message?: string }): string {
  const msg = e?.message || ''
  if (msg.includes('already registered') || msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('user already registered')) {
    return 'Email in use. Sign in instead.'
  }
  if (msg.includes('Invalid login credentials') || msg.includes('Invalid credentials') || msg.includes('Email not confirmed')) {
    return SIGN_IN_NEUTRAL_MESSAGE
  }
  if (msg.toLowerCase().includes('password')) {
    return parsePasswordErrorMessage(msg)
  }
  if (msg.includes('Unable to validate email')) {
    return 'That email address looks invalid.'
  }
  if (msg.includes('Terms of Service')) {
    return msg
  }
  return msg || 'Something went wrong.'
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: ui,
  fontSize: TYPE.label,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  marginBottom: '8px',
  fontWeight: 700,
}

interface AuthTextFieldProps {
  id: string
  label: string
  type: 'email' | 'password'
  value: string
  autoComplete: string
  disabled?: boolean
  onChange: (value: string) => void
  onFocus?: () => void
  onClick?: () => void
  onEnter?: () => void
}

function AuthTextField({
  id,
  label,
  type,
  value,
  autoComplete,
  disabled = false,
  onChange,
  onFocus,
  onClick,
  onEnter,
}: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div>
      <label htmlFor={id} style={fieldLabelStyle}>{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true)
          onFocus?.()
        }}
        onBlur={() => setFocused(false)}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        className="margo-auth-input"
        style={{
          width: '100%',
          height: '44px',
          padding: '0 14px',
          background: 'var(--surface-2)',
          border: `1px solid ${focused ? 'var(--gold-border)' : 'var(--border)'}`,
          borderRadius: '12px',
          color: 'var(--text)',
          fontFamily: ui,
          fontSize: TYPE.body,
          letterSpacing: '-0.01em',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease',
        }}
      />
      <style jsx>{`
        .margo-auth-input::placeholder {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}

const oauthBtnBase: React.CSSProperties = {
  width: '100%',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderRadius: '12px',
  fontFamily: ui,
  fontSize: TYPE.secondary,
  fontWeight: 500,
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'opacity 200ms ease',
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  background: 'var(--gold)',
  color: 'var(--text-on-gold, var(--bg))',
  border: 'none',
  borderRadius: '50px',
  fontFamily: ui,
  fontWeight: 600,
  fontSize: TYPE.meta,
  letterSpacing: '0.2px',
}

export function TermsCompletionForm({ onSuccess, externalError }: TermsCompletionFormProps) {
  const { rehydrate } = useAuthGate()
  const { waitUntilReady } = useIdentity()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (externalError) setError(externalError)
  }, [externalError])

  const handleSubmit = async () => {
    if (redirecting) return
    if (!termsAccepted) {
      setError(CONSENT_REQUIRED_SHORT)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedTerms: true }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw { message: body.error || 'Something went wrong.' }
      }
      await rehydrate({ force: true })
      setRedirecting(true)
      toast.success('Welcome to Margo.')
      // Profile creation can lag behind OAuth; do not block terms completion on it.
      void waitUntilReady()
      if (onSuccess) {
        onSuccess()
      } else {
        const row = await waitUntilReady()
        completeAuthNavigation(resolvePostAuthNavigation(row, null))
      }
      return
    } catch (e) {
      setError(friendlyError(e as { message?: string }))
      setLoading(false)
    }
  }

  const disabled = loading || redirecting || !termsAccepted

  return (
    <div style={{ width: '100%' }}>
      <header style={{ marginBottom: '28px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: ui,
          fontSize: TYPE.pageTitle,
          color: 'var(--text)',
          fontWeight: 600,
          margin: '0 0 14px',
        }}>
          Finish account
        </h1>
        <TermsCompletionIntro />
      </header>

      <div style={{ marginBottom: '20px' }}>
        <SignupConsentCheckbox
          id="terms-completion-consent"
          checked={termsAccepted}
          onChange={setTermsAccepted}
          disabled={loading}
        />
      </div>

      {(error || externalError) ? (
        <div style={{ margin: '0 0 16px' }}>
          {(error || externalError) === CONSENT_REQUIRED_SHORT
            || (error || externalError) === CONSENT_REQUIRED_MESSAGE
            ? <ConsentRequiredAlert />
            : (
              <p role="alert" style={{ fontFamily: ui, fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                {error || externalError}
              </p>
            )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => { void handleSubmit() }}
        disabled={disabled}
        style={{
          ...primaryBtnStyle,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {redirecting ? 'Opening Margo…' : loading ? 'Saving…' : 'Continue'}
      </button>
    </div>
  )
}

export function AuthForm({
  mode,
  onSuccess,
  onSwitchMode,
  externalError,
  oauthReturnTo,
  hideTitle,
  initialShowEmail = false,
  confirmedBanner = null,
  onSignupCheckEmailView,
}: AuthFormProps) {
  const { rehydrate } = useAuthGate()
  const { waitUntilReady } = useIdentity()
  const emailId = useId()
  const isSignup = mode === 'signup'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [consentAttention, setConsentAttention] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'email' | 'google' | 'discord' | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(initialShowEmail)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [consentError, setConsentError] = useState(false)
  const [signInFailed, setSignInFailed] = useState(false)
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [cooldownTick, setCooldownTick] = useState(0)

  useEffect(() => {
    if (!isSignup) {
      setTermsAccepted(false)
      setPendingEmail(null)
    }
    setShowEmailForm(initialShowEmail)
    setEmailError(null)
    setPasswordError(null)
    setConsentError(false)
    setSignInFailed(false)
    setResendCooldownUntil(0)
    setResendStatus(null)
  }, [isSignup, initialShowEmail])

  useEffect(() => {
    if (resendCooldownUntil <= Date.now()) return
    const t = window.setInterval(() => setCooldownTick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [resendCooldownUntil])

  useEffect(() => {
    if (termsAccepted) {
      setConsentError(false)
      if (error === CONSENT_REQUIRED_MESSAGE) setError('')
    }
  }, [termsAccepted, error])

  useEffect(() => {
    if (isSignup && !termsAccepted) {
      setConsentAttention(true)
      return
    }
    setConsentAttention(false)
  }, [isSignup, termsAccepted])

  useEffect(() => {
    if (externalError) setError(externalError)
  }, [externalError])

  useEffect(() => {
    onSignupCheckEmailView?.(!!pendingEmail)
  }, [pendingEmail, onSignupCheckEmailView])

  const loading = busy !== null
  const signupBlocked = isSignup && !termsAccepted

  const remindConsentIfNeeded = () => {
    if (isSignup && !termsAccepted) {
      setConsentError(true)
    }
  }

  const requireConsentForAction = (): boolean => {
    if (!isSignup || termsAccepted) return true
    setConsentError(true)
    return false
  }

  const resendCooldownActive = resendCooldownUntil > Date.now()

  const handleResendConfirmation = async () => {
    const trimmed = email.trim()
    if (!trimmed || resendCooldownActive || resendBusy) return
    setResendBusy(true)
    setResendStatus(null)
    const supabase = createClient()
    await supabase.auth.resend({
      type: 'signup',
      email: trimmed,
    })
    setResendStatus(RESEND_CONFIRM_NEUTRAL_MESSAGE)
    setResendCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
    setResendBusy(false)
  }

  const handleEmailSubmit = async () => {
    setEmailError(null)
    setPasswordError(null)
    setError('')
    if (!requireConsentForAction()) return
    if (isSignup) {
      const pw = validatePassword(password)
      if (!pw.ok) {
        setPasswordError(pw.message)
        return
      }
    }

    setBusy('email')
    try {
      const path = isSignup ? '/api/auth/signup' : '/api/auth/login'
      const res = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(isSignup ? { acceptedTerms: true } : {}),
        }),
      })
      const body = await res.json().catch(() => ({})) as {
        error?: string
        access_token?: string
        needs_confirmation?: boolean
      }
      if (!res.ok) {
        const msg = body.error || 'Something went wrong.'
        if (!isSignup) {
          setPasswordError(SIGN_IN_NEUTRAL_MESSAGE)
          setSignInFailed(true)
          return
        }
        if (/password|character|letter|number|weak/i.test(msg)) {
          setPasswordError(parsePasswordErrorMessage(msg))
          return
        }
        throw { message: msg }
      }
      setSignInFailed(false)

      if (body.access_token) {
        setBrowserAccessToken(body.access_token)
        await rehydrate()
        const row = await waitUntilReady()
        if (isSignup) toast.success('Welcome to Margo.')
        if (onSuccess) {
          onSuccess()
        } else {
          completeAuthNavigation(resolvePostAuthNavigation(row, oauthReturnTo))
        }
        return
      }

      if (isSignup && body.needs_confirmation) {
        setPendingEmail(email.trim())
        return
      }

      throw { message: 'Something went wrong.' }
    } catch (e) {
      const msg = friendlyError(e as { message?: string })
      if (/email|address|registered|confirm/i.test(msg)) {
        setEmailError(msg)
      } else {
        setError(msg)
      }
    } finally {
      setBusy(null)
    }
  }

  const handleOAuthSubmit = (provider: 'google' | 'discord') => {
    if (!requireConsentForAction()) return
    setBusy(provider)
    setError('')
    const params = new URLSearchParams()
    params.set('intent', isSignup ? 'signup' : 'signin')
    if (isSignup) params.set('terms', '1')
    if (oauthReturnTo?.startsWith('/')) params.set('returnTo', oauthReturnTo)
    window.location.assign(`/api/auth/oauth/${provider}?${params.toString()}`)
  }

  if (pendingEmail) {
    return (
      <div style={{ width: '100%' }} data-margo-auth-check-email="signup">
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
            Link sent to <span style={{ color: 'var(--text)' }}>{pendingEmail}</span>. Open it, then{' '}
            <Link
              href="/signin?mode=signin"
              style={{
                color: 'var(--gold)',
                fontSize: TYPE.secondary,
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              sign in
            </Link>
            .
          </p>
        </header>
      </div>
    )
  }

  const primaryDisabled = loading || !email || !password || signupBlocked

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }} data-margo-auth-form data-margo-auth-email-open={showEmailForm ? '1' : '0'}>
      {confirmedBanner ? (
        <p role="status" style={{
          fontFamily: ui,
          fontSize: TYPE.secondary,
          color: 'var(--success)',
          margin: '0 0 14px',
          lineHeight: 1.35,
          wordBreak: 'break-word',
        }}>
          {confirmedBanner}
        </p>
      ) : null}
      {hideTitle ? null : (
        <header style={{ marginBottom: isSignup ? '18px' : '28px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: ui,
            fontSize: TYPE.pageTitle,
            color: 'var(--text)',
            fontWeight: 600,
            margin: 0,
          }}>
            {isSignup ? 'Create account' : 'Sign in'}
          </h1>
        </header>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: showEmailForm ? '16px' : '0' }}>
        <button
          type="button"
          onClick={() => handleOAuthSubmit('google')}
          disabled={loading}
          aria-busy={busy === 'google'}
          style={{
            ...oauthBtnBase,
            background: 'rgba(255,255,255,0.03)',
            border: busy === 'google' ? '1px solid var(--gold-border)' : '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text)',
            opacity: loading ? 0.55 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          {busy === 'google' ? (
            <LoadingRing size={16} strokeWidth={1.5} state="spinning" />
          ) : 'Continue with Google'}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSubmit('discord')}
          disabled={loading}
          aria-busy={busy === 'discord'}
          style={{
            ...oauthBtnBase,
            background: 'rgba(88,101,242,0.1)',
            border: busy === 'discord' ? '1px solid var(--gold-border)' : '1px solid rgba(88,101,242,0.28)',
            color: 'var(--text)',
            opacity: loading ? 0.55 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          {busy === 'discord' ? (
            <LoadingRing size={16} strokeWidth={1.5} state="spinning" />
          ) : 'Continue with Discord'}
        </button>

        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => {
              setShowEmailForm(true)
              setError('')
            }}
            disabled={loading}
            style={{
              ...oauthBtnBase,
              background: 'var(--gold-faint)',
              border: '1px solid var(--gold-border)',
              color: 'var(--text)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Continue with email
          </button>
        ) : null}
      </div>

      {showEmailForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }} data-margo-auth-email-form>
          <div>
            <AuthTextField
              id={emailId}
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={loading}
              onChange={(v) => { setEmail(v); setEmailError(null) }}
              onFocus={() => {
                remindConsentIfNeeded()
                scrollAuthFieldIntoView(document.getElementById(emailId))
              }}
              onClick={remindConsentIfNeeded}
              onEnter={() => { void handleEmailSubmit() }}
            />
            {emailError ? (
              <p role="alert" style={{
                fontFamily: ui,
                fontSize: TYPE.meta,
                color: 'var(--destructive)',
                margin: '6px 0 0',
              }}>
                {emailError}
              </p>
            ) : null}
          </div>

          <AuthPasswordField
            value={password}
            disabled={loading}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            error={passwordError}
            showRequirements={isSignup}
            showMeter={isSignup}
            onChange={(v) => {
              setPassword(v)
              setPasswordError(null)
              setSignInFailed(false)
              setResendStatus(null)
            }}
            onEnter={() => { void handleEmailSubmit() }}
            errorAddon={!isSignup && signInFailed && passwordError ? (
              <button
                type="button"
                onClick={() => { void handleResendConfirmation() }}
                disabled={resendCooldownActive || resendBusy || !email.trim()}
                aria-disabled={resendCooldownActive || resendBusy || !email.trim()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldownActive ? 'var(--text-muted)' : 'var(--gold)',
                  fontFamily: ui,
                  fontSize: TYPE.meta,
                  cursor: resendCooldownActive || resendBusy || !email.trim() ? 'not-allowed' : 'pointer',
                  minHeight: '44px',
                  padding: '0 4px',
                  opacity: resendCooldownActive ? 0.55 : 1,
                  flexShrink: 0,
                }}
              >
                {resendBusy ? 'Sending…' : resendCooldownActive ? 'Resend in 1 min' : 'Resend confirmation email'}
              </button>
            ) : undefined}
            forgotPasswordSlot={!isSignup ? (
              <Link
                href="/forgot-password"
                style={{
                  fontFamily: ui,
                  fontSize: TYPE.meta,
                  color: 'var(--gold)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '44px',
                  padding: '0 4px',
                }}
              >
                Forgot password?
              </Link>
            ) : undefined}
          />

          {isSignup && showEmailForm ? (
            <SignupConsentGate highlight={consentAttention && !termsAccepted} consentError={consentError}>
              <SignupConsentCheckbox
                id="signup-consent"
                checked={termsAccepted}
                onChange={(v) => {
                  setTermsAccepted(v)
                  if (v) {
                    setConsentError(false)
                    setError('')
                  }
                }}
                disabled={loading}
              />
            </SignupConsentGate>
          ) : null}

          {resendStatus ? (
            <p style={{ fontFamily: ui, fontSize: TYPE.meta, color: 'var(--text-muted)', margin: 0 }}>
              {resendStatus}
            </p>
          ) : null}

          {error && error !== CONSENT_REQUIRED_MESSAGE ? (
            <p role="alert" style={{
              fontFamily: ui,
              fontSize: TYPE.meta,
              color: 'var(--destructive)',
              margin: 0,
              wordBreak: 'break-word',
            }}>
              {error}
            </p>
          ) : null}
          {externalError && !isSignup ? (
            <p role="alert" style={{
              fontFamily: ui,
              fontSize: TYPE.meta,
              color: 'var(--destructive)',
              margin: 0,
              wordBreak: 'break-word',
            }}>
              {externalError}
            </p>
          ) : null}

          <button
            type="button"
            data-margo-auth-submit
            onClick={() => { void handleEmailSubmit() }}
            disabled={primaryDisabled}
            aria-disabled={primaryDisabled}
            aria-busy={busy === 'email'}
            style={{
              ...primaryBtnStyle,
              cursor: primaryDisabled ? 'not-allowed' : 'pointer',
              opacity: primaryDisabled ? 0.55 : 1,
              marginTop: '4px',
            }}
          >
            {busy === 'email' ? (
              <LoadingRing size={18} strokeWidth={1.5} state="spinning" color="var(--bg)" />
            ) : (isSignup ? 'Create account' : 'Sign in')}
          </button>
        </div>
      ) : null}

      {onSwitchMode && !pendingEmail ? (
        <p style={{ textAlign: 'center', marginTop: '22px', fontFamily: ui, fontSize: TYPE.secondary, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
          {isSignup ? 'Have an account? ' : 'New here? '}
          <button
            type="button"
            onClick={() => onSwitchMode(isSignup ? 'signin' : 'signup')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold)',
              cursor: 'pointer',
              fontFamily: ui,
              fontSize: TYPE.meta,
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {isSignup ? 'Sign in' : 'Create account'}
          </button>
        </p>
      ) : null}
    </div>
  )
}

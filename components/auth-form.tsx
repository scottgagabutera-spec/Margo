'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { setBrowserAccessToken } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import {
  CONSENT_REQUIRED_MESSAGE,
  ConsentRequiredAlert,
  SignupConsentCheckbox,
  SignupConsentGate,
  SignupConsentIntro,
  TermsCompletionIntro,
} from '@/components/signup-legal-notice'
import { UI_FONT } from '@/lib/fonts'

const lora = 'var(--font-lora), serif'
const ui = UI_FONT

export type AuthMode = 'signup' | 'signin'

interface AuthFormProps {
  mode: AuthMode
  onSuccess?: () => void
  onSwitchMode?: (mode: AuthMode) => void
  externalError?: string | null
  /** Post-OAuth redirect path (e.g. /compose) — set by auth gate. */
  oauthReturnTo?: string | null
}

interface TermsCompletionFormProps {
  onSuccess?: () => void
  externalError?: string | null
}

function friendlyError(e: { message?: string }): string {
  const msg = e?.message || ''
  if (msg.includes('already registered') || msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('user already registered')) {
    return 'That email already has an account — try signing in instead.'
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }
  if (msg.toLowerCase().includes('password')) {
    return 'Password should be at least 6 characters.'
  }
  if (msg.includes('Unable to validate email')) {
    return 'That email address looks invalid.'
  }
  if (msg.includes('Terms of Service')) {
    return msg
  }
  return msg || 'Something went wrong. Please try again.'
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: ui,
  fontSize: '0.6rem',
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
          fontSize: '0.95rem',
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
  fontSize: '0.8rem',
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
  fontSize: '0.78rem',
  letterSpacing: '0.2px',
}

export function TermsCompletionForm({ onSuccess, externalError }: TermsCompletionFormProps) {
  const router = useRouter()
  const { rehydrate } = useAuthGate()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (externalError) setError(externalError)
  }, [externalError])

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError(CONSENT_REQUIRED_MESSAGE)
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
        throw { message: body.error || 'Something went wrong. Please try again.' }
      }
      await rehydrate()
      toast.success('Welcome to Margo.')
      onSuccess?.() ?? router.push('/feed')
    } catch (e) {
      setError(friendlyError(e as { message?: string }))
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || !termsAccepted

  return (
    <div style={{ width: '100%' }}>
      <header style={{ marginBottom: '28px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: lora,
          fontSize: '1.55rem',
          color: 'var(--text)',
          fontWeight: 400,
          margin: '0 0 14px',
        }}>
          Finish creating your account
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
          {(error || externalError) === CONSENT_REQUIRED_MESSAGE
            ? <ConsentRequiredAlert message={CONSENT_REQUIRED_MESSAGE} />
            : (
              <p role="alert" style={{ fontFamily: ui, fontSize: '0.78rem', color: '#ff7070', margin: 0, lineHeight: 1.45 }}>
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
        {loading ? 'Saving…' : 'Continue to Margo'}
      </button>
    </div>
  )
}

export function AuthForm({ mode, onSuccess, onSwitchMode, externalError, oauthReturnTo }: AuthFormProps) {
  const { rehydrate } = useAuthGate()
  const emailId = useId()
  const passwordId = useId()
  const isSignup = mode === 'signup'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [consentAttention, setConsentAttention] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isSignup) {
      setTermsAccepted(false)
      setPendingEmail(null)
    }
  }, [isSignup])

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

  const signupBlocked = isSignup && !termsAccepted
  const oauthLoading = loading
  const oauthVisuallyMuted = oauthLoading || signupBlocked

  const remindConsentIfNeeded = () => {
    if (isSignup && !termsAccepted) {
      setError(CONSENT_REQUIRED_MESSAGE)
    }
  }

  const handleEmailSubmit = async () => {
    if (isSignup && !termsAccepted) {
      setError(CONSENT_REQUIRED_MESSAGE)
      return
    }

    setLoading(true)
    setError('')
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
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw { message: body.error || 'Something went wrong. Please try again.' }
      }

      if (body.access_token) {
        setBrowserAccessToken(body.access_token)
        await rehydrate()
        if (isSignup) toast.success('Welcome to Margo.')
        onSuccess?.()
        return
      }

      if (isSignup && body.needs_confirmation) {
        setPendingEmail(email.trim())
        return
      }

      throw { message: 'Something went wrong. Please try again.' }
    } catch (e) {
      setError(friendlyError(e as { message?: string }))
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSubmit = (provider: 'google' | 'discord') => {
    if (isSignup && !termsAccepted) {
      setError(CONSENT_REQUIRED_MESSAGE)
      return
    }
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    params.set('intent', isSignup ? 'signup' : 'signin')
    if (isSignup) params.set('terms', '1')
    if (oauthReturnTo?.startsWith('/')) params.set('returnTo', oauthReturnTo)
    window.location.assign(`/api/auth/oauth/${provider}?${params.toString()}`)
  }

  if (pendingEmail) {
    return (
      <div style={{ width: '100%' }}>
        <header style={{ marginBottom: '22px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: lora,
            fontSize: '1.55rem',
            color: 'var(--text)',
            fontWeight: 400,
            margin: '0 0 14px',
          }}>
            Check your email to confirm your account
          </h1>
          <p style={{
            fontFamily: ui,
            fontSize: '0.88rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            margin: 0,
          }}>
            We sent a confirmation link to <span style={{ color: 'var(--text)' }}>{pendingEmail}</span>.
            Open it to confirm your account, then come back and sign in.
          </p>
        </header>
        <button
          type="button"
          onClick={() => {
            setPendingEmail(null)
            onSwitchMode?.('signin')
          }}
          style={{
            ...primaryBtnStyle,
            cursor: 'pointer',
          }}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  const primaryDisabled = loading || !email || !password || signupBlocked
  const alertMessage = error || externalError

  const renderFormError = (message: string) => {
    if (message === CONSENT_REQUIRED_MESSAGE) {
      return <ConsentRequiredAlert message={message} />
    }
    return (
      <p role="alert" style={{
        fontFamily: ui,
        fontSize: '0.78rem',
        color: '#ff7070',
        margin: 0,
        lineHeight: 1.45,
      }}>
        {message}
      </p>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <header style={{ marginBottom: isSignup ? '18px' : '28px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: lora,
          fontSize: '1.55rem',
          color: 'var(--text)',
          fontWeight: 400,
          margin: 0,
        }}>
          {isSignup ? 'Create your account' : 'Sign in'}
        </h1>
      </header>

      {isSignup ? (
        <>
          <SignupConsentIntro />
          <SignupConsentGate highlight={consentAttention && !termsAccepted}>
            <SignupConsentCheckbox
              id="signup-consent"
              checked={termsAccepted}
              onChange={setTermsAccepted}
              disabled={loading}
            />
          </SignupConsentGate>
        </>
      ) : null}

      {alertMessage ? (
        <div style={{ margin: '0 0 16px' }}>
          {renderFormError(alertMessage)}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
        <button
          type="button"
          onClick={() => handleOAuthSubmit('google')}
          disabled={oauthLoading}
          aria-disabled={oauthVisuallyMuted}
          style={{
            ...oauthBtnBase,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text)',
            opacity: oauthVisuallyMuted ? 0.55 : 1,
            cursor: oauthLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          {isSignup ? 'Continue with Google' : 'Sign in with Google'}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSubmit('discord')}
          disabled={oauthLoading}
          aria-disabled={oauthVisuallyMuted}
          style={{
            ...oauthBtnBase,
            background: 'rgba(88,101,242,0.1)',
            border: '1px solid rgba(88,101,242,0.28)',
            color: 'var(--text)',
            opacity: oauthVisuallyMuted ? 0.55 : 1,
            cursor: oauthLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
            <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          {isSignup ? 'Continue with Discord' : 'Sign in with Discord'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        <span style={{ fontFamily: ui, fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>or email</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <AuthTextField
          id={emailId}
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          disabled={loading}
          onChange={setEmail}
          onFocus={remindConsentIfNeeded}
          onClick={remindConsentIfNeeded}
          onEnter={() => { void handleEmailSubmit() }}
        />
        <AuthTextField
          id={passwordId}
          label="Password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={password}
          disabled={loading}
          onChange={setPassword}
          onFocus={remindConsentIfNeeded}
          onClick={remindConsentIfNeeded}
          onEnter={() => { void handleEmailSubmit() }}
        />

        <button
          type="button"
          onClick={() => { void handleEmailSubmit() }}
          disabled={primaryDisabled}
          aria-disabled={primaryDisabled}
          style={{
            ...primaryBtnStyle,
            cursor: primaryDisabled ? 'not-allowed' : 'pointer',
            opacity: primaryDisabled ? 0.55 : 1,
            marginTop: '4px',
          }}
        >
          {loading
            ? (isSignup ? 'Creating account…' : 'Signing in…')
            : (isSignup ? 'Create account' : 'Sign in')}
        </button>
      </div>

      {onSwitchMode ? (
        <p style={{ textAlign: 'center', marginTop: '22px', fontFamily: ui, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {isSignup ? 'Already have an account? ' : 'New to Margo? '}
          <button
            type="button"
            onClick={() => onSwitchMode(isSignup ? 'signin' : 'signup')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold)',
              cursor: 'pointer',
              fontFamily: ui,
              fontSize: '0.78rem',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      ) : null}
    </div>
  )
}

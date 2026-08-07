'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { AuthError } from '@supabase/supabase-js'

const font = 'var(--font-lora), serif'

type Mode = 'signup' | 'signin'

interface AuthFormProps {
  mode: Mode
  onSuccess?: () => void
  onSwitchMode?: (mode: Mode) => void
}

function friendlyError(e: AuthError): string {
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
  return msg || 'Something went wrong. Please try again.'
}

export function AuthForm({ mode, onSuccess, onSwitchMode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        toast.success('Welcome to Margo.')
        onSuccess?.()
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        onSuccess?.()
      }
    } catch (e) {
      setError(friendlyError(e as AuthError))
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSubmit = async (provider: 'google' | 'discord') => {
    setLoading(true)
    setError('')
    const redirectTo = `${window.location.origin}/auth/callback`
    try {
      // PKCE code verifier must live in a cookie so the server Route Handler
      // at /auth/callback can exchange the code (Phase 2). Other auth still
      // uses the old localStorage client until later migration phases.
      const browser = createBrowserClient()
      const { error: oauthError } = await browser.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (oauthError) throw oauthError
    } catch (e) {
      setError(friendlyError(e as AuthError))
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
          Margo
        </p>
        <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>
          {mode === 'signup' ? 'Create your account' : 'Sign in'}
        </h1>
      </div>

      <button
        onClick={() => handleOAuthSubmit('google')}
        disabled={loading}
        style={{
          width: '100%', height: '48px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '10px', marginBottom: '12px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px', color: 'var(--text)', fontFamily: font,
          fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1, boxSizing: 'border-box',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </button>

      <button
        onClick={() => handleOAuthSubmit('discord')}
        disabled={loading}
        style={{
          width: '100%', height: '48px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '10px', marginBottom: '16px',
          background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.3)',
          borderRadius: '10px', color: 'var(--text)', fontFamily: font,
          fontSize: '0.82rem', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1, boxSizing: 'border-box',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#5865F2">
          <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Continue with Discord
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontFamily: font, fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
            style={{ width: '100%', height: '44px', padding: '0 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text)', fontFamily: font, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: font, fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
            style={{ width: '100%', height: '44px', padding: '0 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text)', fontFamily: font, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {error && <p style={{ fontFamily: font, fontSize: '0.75rem', color: '#ff6060' }}>{error}</p>}
        <button onClick={handleEmailSubmit} disabled={loading || !email || !password}
          style={{
            width: '100%', padding: '14px', background: 'var(--gold)', color: 'var(--bg)',
            border: 'none', borderRadius: '10px', fontFamily: font, fontWeight: 700,
            fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: (loading || !email || !password) ? 0.6 : 1,
          }}
        >
          {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Sign Up' : 'Sign In')}
        </button>
      </div>

      {onSwitchMode && (
        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: font, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
          <button
            onClick={() => onSwitchMode(mode === 'signup' ? 'signin' : 'signup')}
            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontFamily: font, fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}
          >
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </p>
      )}
    </div>
  )
}
'use client'
import { useState } from 'react'
import { auth } from '@/lib/firebase'
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  type AuthError,
} from 'firebase/auth'

const font = 'var(--font-lora), serif'

type Mode = 'signup' | 'signin'

interface AuthFormProps {
  mode: Mode
  onSuccess?: () => void
  onSwitchMode?: (mode: Mode) => void
}

function friendlyError(e: AuthError): string {
  switch (e.code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'That email already has an account — try signing in instead.'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/user-not-found':
      return 'No account found with that email.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/popup-closed-by-user':
      return '' // silent — they just closed it, not a real error
    default:
      return e.message || 'Something went wrong. Please try again.'
  }
}

export function AuthForm({ mode, onSuccess, onSwitchMode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = async () => {
    if (!auth) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const credential = EmailAuthProvider.credential(email, password)
        const current = auth.currentUser
        if (current && current.isAnonymous) {
          // Upgrade the existing anonymous session in place — same UID,
          // so every post and the identity record carry over untouched.
          await linkWithCredential(current, credential)
        } else {
          // No anonymous session somehow — fall back to a fresh signup.
          const { createUserWithEmailAndPassword } = await import('firebase/auth')
          await createUserWithEmailAndPassword(auth, email, password)
        }
      } else {
        // Signing in to an existing real account — this intentionally
        // switches away from whatever anonymous session was active.
        await signInWithEmailAndPassword(auth, email, password)
      }
      onSuccess?.()
    } catch (e) {
      setError(friendlyError(e as AuthError))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSubmit = async () => {
    if (!auth) return
    setLoading(true)
    setError('')
    const provider = new GoogleAuthProvider()
    try {
      if (mode === 'signup') {
        const current = auth.currentUser
        if (current && current.isAnonymous) {
          try {
            await linkWithPopup(current, provider)
          } catch (e) {
            const err = e as AuthError
            if (err.code === 'auth/credential-already-in-use') {
              // This Google account already has a real Margo account —
              // sign into that instead of failing outright.
              await signInWithPopup(auth, provider)
            } else {
              throw err
            }
          }
        } else {
          await signInWithPopup(auth, provider)
        }
      } else {
        await signInWithPopup(auth, provider)
      }
      onSuccess?.()
    } catch (e) {
      const msg = friendlyError(e as AuthError)
      if (msg) setError(msg)
    } finally {
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
        onClick={handleGoogleSubmit}
        disabled={loading}
        style={{
          width: '100%', height: '48px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '10px', marginBottom: '16px',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontFamily: font, fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEmailSubmit()}
            style={{ width: '100%', height: '44px', padding: '0 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text)', fontFamily: font, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontFamily: font, fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Password</label>
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
        <p style={{ textAlign: 'center', marginTop: '24px', fontFamily: font, fontSize: '0.78rem', color: 'var(--text-3)' }}>
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
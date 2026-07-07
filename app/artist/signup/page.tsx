'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useArtistAuth } from '@/hooks/useArtistAuth'

const S: Record<string, any> = {
  input: {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    color: 'var(--text)', fontFamily: 'var(--font-lora), serif',
    fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
    minHeight: '44px',
  },
  label: {
    display: 'block', fontFamily: 'var(--font-lora), serif',
    fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px',
  },
  btn: {
    padding: '14px 24px', background: 'var(--gold)', color: 'var(--bg)',
    border: 'none', borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
    fontWeight: 700, fontSize: '1rem', letterSpacing: '1px',
    textTransform: 'uppercase', cursor: 'pointer', minHeight: '44px',
    boxSizing: 'border-box', width: '100%',
  },
}

export default function ArtistSignupPage() {
  const router = useRouter()
  const { signUpArtist } = useArtistAuth()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setError('')

    if (!displayName.trim()) { setError('Enter an artist or stage name.'); return }
    if (!email.trim()) { setError('Enter an email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (!agreed) { setError('You must agree to the rights warranty to continue.'); return }

    setLoading(true)
    try {
      await signUpArtist(email.trim(), password, displayName, agreed)
      router.push('/feed')
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') setError('An account already exists with this email.')
      else if (e.code === 'auth/invalid-email') setError('That email address looks invalid.')
      else setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Margo for Artists
          </p>
          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>
            Create your artist account
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={S.label}>Artist / Stage Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={S.input} />
          </div>

          {/*
            PLACEHOLDER — pending legal review.
            This warranty language must be reviewed and finalized before this
            form is opened to real artists. Do not treat this copy as final.
          */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5, padding: '4px 0',
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: '3px', width: '18px', height: '18px', flexShrink: 0, accentColor: 'var(--gold)' }}
            />
            <span>
              [PLACEHOLDER] I confirm that I own the rights to any music I upload,
              or have explicit permission from the rights holder to distribute it
              on Margo, and I agree to Margo's Terms of Use and Copyright Policy.
            </span>
          </label>

          {error && (
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: '#ff6060' }}>
              {error}
            </p>
          )}

          <button onClick={handleSignup} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '8px' }}>
            Already have an account? <a href="/artist/signin" style={{ color: 'var(--gold)' }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
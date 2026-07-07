'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useArtistAuth } from '@/hooks/useArtistAuth'

const S: Record<string, any> = {
  input: {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    color: 'var(--text)', fontFamily: 'var(--font-lora), serif',
    fontSize: '1rem', outline: 'none', boxSizing: 'border-box', minHeight: '44px',
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

export default function ArtistSigninPage() {
  const router = useRouter()
  const { signInArtist } = useArtistAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignin = async () => {
    setError('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setLoading(true)
    try {
      await signInArtist(email.trim(), password)
      router.push('/artist/pending')
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') setError('Incorrect email or password.')
      else if (e.code === 'auth/user-not-found') setError('No account found with that email.')
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
            Sign in
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignin()} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignin()} style={S.input} />
          </div>
          {error && <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: '#ff6060' }}>{error}</p>}
          <button onClick={handleSignin} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '8px' }}>
            New artist? <a href="/artist/signup" style={{ color: 'var(--gold)' }}>Create an account</a>
          </p>
        </div>
      </div>
    </div>
  )
}
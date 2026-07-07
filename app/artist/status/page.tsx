'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useArtistAuth } from '@/hooks/useArtistAuth'

export default function ArtistStatusPage() {
  const router = useRouter()
  const { user, profile, loading, signOutArtist } = useArtistAuth()

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/artist/signin'); return }
    if (profile?.status === 'active' || profile?.status === 'warned') {
      router.push('/feed')
    }
  }, [loading, user, profile, router])

  if (loading || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
      </div>
    )
  }

  const isRemoved = profile.status === 'removed'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: '#ff6060', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
          Margo for Artists
        </p>
        <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400, marginBottom: '16px', lineHeight: 1.4 }}>
          {isRemoved ? 'This account has been removed' : 'This account is temporarily frozen'}
        </h1>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '8px' }}>
          {profile.statusReason || 'Please contact Margo for more information.'}
        </p>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '32px' }}>
          If you believe this is a mistake, reach out at contact@trymargo.com.
        </p>
        <button
          onClick={() => signOutArtist().then(() => router.push('/'))}
          style={{
            padding: '14px 24px', background: 'transparent', color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px',
            fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.7rem',
            letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer',
            minHeight: '44px', boxSizing: 'border-box',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
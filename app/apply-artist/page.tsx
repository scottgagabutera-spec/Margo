'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { ArtistApplicationForm } from '@/components/artist-application-form'
import { BackButton } from '@/components/back-button'

const font = 'var(--font-lora), serif'

export default function ApplyArtistPage() {
  const router = useRouter()
  const { user, identity, loading } = useIdentity()
  const { application } = useArtistApplication()

  // Applying requires a real account — anonymous visitors get sent to sign in first.
  useEffect(() => {
    if (loading) return
    if (!user || user.isAnonymous) {
      router.push('/signin')
    }
  }, [loading, user, router])

  if (loading || !identity || !user || user.isAnonymous) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: font, color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
      </div>
    )
  }

  const status = application?.status ?? 'none'
  const ownProfileHref = `/profile/${identity.username}`

  if (identity.isArtist) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', padding: '100px 24px var(--margo-page-padding-bottom, 80px)', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <BackButton fallbackHref={ownProfileHref} />
          </div>
          <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Margo
          </p>
          <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400, marginBottom: '12px' }}>
            You're a Verified Artist
          </h1>
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '28px' }}>
            You can upload songs independently whenever you're ready.
          </p>
          {/* FIX: this used to route to /compose, which is the
              lyric-Resonance posting flow, not song upload. The real
              upload tool is /studio (gated on identity.isArtist there
              too), so this button now correctly matches the promise
              made in the copy above it. */}
          <button
            onClick={() => router.push('/studio')}
            style={{
              padding: '14px 24px', background: 'var(--gold)', color: 'var(--bg)',
              border: 'none', borderRadius: '50px', fontFamily: font, fontWeight: 700,
              fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase',
              cursor: 'pointer', minHeight: '44px', boxSizing: 'border-box',
            }}
          >
            Go to Studio
          </button>
        </div>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', padding: '100px 24px var(--margo-page-padding-bottom, 80px)', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <BackButton fallbackHref={ownProfileHref} />
          </div>
          <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Margo
          </p>
          <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400, marginBottom: '12px' }}>
            Your application is being reviewed
          </h1>
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            This usually takes a day or two. We'll let you know as soon as it's approved.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '100px 24px var(--margo-page-padding-bottom, 80px)' }}>
        <div style={{ marginBottom: '24px' }}>
          <BackButton fallbackHref={ownProfileHref} />
        </div>
        {status === 'rejected' && (
          <p style={{
            fontFamily: font, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)',
            textAlign: 'center', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.6,
          }}>
            Your previous application wasn't approved. You're welcome to update the details below and resubmit.
          </p>
        )}
        <ArtistApplicationForm onSubmitted={() => router.refresh()} />
      </div>
    </div>
  )
}
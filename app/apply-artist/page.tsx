'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { ArtistApplicationForm } from '@/components/artist-application-form'
import { ArtistApplicationStatus } from '@/components/artist-application-status'
import { SignInLink } from '@/components/signin-link'
import { buildSigninHref } from '@/lib/auth-return'

import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export default function ApplyArtistPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reapply = searchParams.get('reapply') === '1'
  const { user, identity, loading } = useIdentity()
  const {
    application,
    loading: appLoading,
    submitArtistApplication,
    verifySunoLink,
    importLinktree,
  } = useArtistApplication()
  const [flashSubmitted, setFlashSubmitted] = useState(false)
  const [sunoInstant, setSunoInstant] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user || user.isAnonymous) {
      router.replace(buildSigninHref('/apply-artist'))
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user || user.isAnonymous) return
    void fetch('/api/welcome-series/sync', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistGuideIntent: true }),
    })
  }, [user?.id, user?.isAnonymous])

  if (loading || appLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: font, color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!user || user.isAnonymous || !identity) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ fontFamily: font, color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Sign in to apply as an artist
          </p>
          <SignInLink
            returnTo="/apply-artist"
            style={{
              padding: '10px 24px',
              border: '1px solid var(--border)',
              borderRadius: '50px',
              color: 'var(--text-secondary)',
              fontFamily: font,
              fontSize: '0.6rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Sign In
          </SignInLink>
        </div>
      </div>
    )
  }

  const status = application?.status ?? 'none'

  if (identity.isArtist) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <ArtistApplicationStatus status="approved" sunoInstant={application?.verificationMethod === 'suno'} />
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <ArtistApplicationStatus status="pending" justSubmitted={flashSubmitted} />
      </div>
    )
  }

  if (status === 'rejected' && !reapply) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <ArtistApplicationStatus status="rejected" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)' }}>
        <ArtistApplicationForm
          submitArtistApplication={submitArtistApplication}
          verifySunoLink={verifySunoLink}
          importLinktree={importLinktree}
          onSuccess={(next) => {
            setFlashSubmitted(true)
            setSunoInstant(next === 'approved')
            if (next === 'approved') {
              router.push('/studio')
            }
          }}
        />
      </div>
    </div>
  )
}

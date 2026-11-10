'use client'

import { useRouter } from 'next/navigation'
import type { ArtistApplication } from '@/hooks/useArtistApplication'
import { CheckIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

function statusHeadline(status: ArtistApplication['status']): string {
  if (status === 'pending') return 'Application received'
  if (status === 'rejected') return 'Not approved yet'
  if (status === 'approved') return 'You are verified'
  return 'Apply as an artist'
}

export function ArtistApplicationStatus({
  status,
  justSubmitted,
  sunoInstant,
}: {
  status: ArtistApplication['status']
  justSubmitted?: boolean
  sunoInstant?: boolean
}) {
  const router = useRouter()

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)', textAlign: 'center' }}>
      {justSubmitted ? (
        <p
          style={{
            fontFamily: font,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#5fd68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <CheckIcon size={18} color="#5fd68a" />
          Submitted
        </p>
      ) : null}
      <p style={{ fontFamily: font, fontSize: '0.75rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
        Margo
      </p>
      <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400, marginBottom: '12px' }}>
        {statusHeadline(status)}
      </h1>
      {status === 'pending' ? (
        <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
          Application received. We review every application by hand and answer within 3 business days. You will hear from us in Margo.
        </p>
      ) : null}
      {status === 'rejected' ? (
        <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: '20px' }}>
          Your last application was not approved. You can send a new one with updated links when you are ready.
        </p>
      ) : null}
      {status === 'approved' || sunoInstant ? (
        <>
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: '24px' }}>
            {sunoInstant
              ? 'Your Suno verification passed. Studio is open so you can upload your music.'
              : 'You are verified. Upload whenever you are ready.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/studio')}
            style={{
              padding: '14px 24px',
              background: 'var(--gold)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '12px',
              fontFamily: font,
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Go to Studio
          </button>
        </>
      ) : null}
      {status === 'rejected' ? (
        <button
          type="button"
          onClick={() => router.push('/apply-artist?reapply=1')}
          style={{
            marginTop: '8px',
            padding: '12px 20px',
            background: 'var(--gold)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: '12px',
            fontFamily: font,
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            minHeight: '44px',
          }}
        >
          Apply again
        </button>
      ) : null}
    </div>
  )
}

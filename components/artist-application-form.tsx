'use client'
import { useState } from 'react'
import { useIdentity, type ArtistApplicationLinks } from '@/hooks/useIdentity'

const font = 'var(--font-lora), serif'

const LINK_FIELDS: { key: keyof ArtistApplicationLinks; label: string; placeholder: string }[] = [
  { key: 'spotify', label: 'Spotify', placeholder: 'open.spotify.com/artist/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@yourname' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'soundcloud.com/yourname' },
  { key: 'instagram', label: 'Instagram', placeholder: 'instagram.com/yourname' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'tiktok.com/@yourname' },
  { key: 'other', label: 'Other', placeholder: 'Any other link that helps verify you' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', height: '44px', padding: '0 14px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: 'var(--text)', fontFamily: font,
  fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: font, fontSize: '0.55rem',
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  letterSpacing: '1.5px', marginBottom: '6px',
}

interface ArtistApplicationFormProps {
  onSubmitted?: () => void
}

export function ArtistApplicationForm({ onSubmitted }: ArtistApplicationFormProps) {
  const { submitArtistApplication } = useIdentity()
  const [displayArtistName, setDisplayArtistName] = useState('')
  const [links, setLinks] = useState<ArtistApplicationLinks>({})
  const [note, setNote] = useState('')
  const [rightsAgreed, setRightsAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setLink = (key: keyof ArtistApplicationLinks, value: string) => {
    setLinks(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    const result = await submitArtistApplication({ displayArtistName, links, note, rightsAgreed })
    setLoading(false)
    if (!result.success) {
      setError(result.error || 'Something went wrong. Please try again.')
      return
    }
    onSubmitted?.()
  }

  return (
    <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>
          Margo
        </p>
        <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400, marginBottom: '10px' }}>
          Apply as an Artist
        </h1>
        <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          Tell us who you are so we can verify you and unlock independent song uploads.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Artist Name</label>
          <input
            type="text"
            value={displayArtistName}
            onChange={e => setDisplayArtistName(e.target.value)}
            placeholder="How you're known as an artist"
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: '6px' }}>
          <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
            Add at least one link
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {LINK_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input
                  type="text"
                  value={links[key] || ''}
                  onChange={e => setLink(key, e.target.value)}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Anything else? (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'vertical', fontFamily: font }}
          />
        </div>

        {/*
          PLACEHOLDER — pending legal review.
          This warranty language must be reviewed and finalized before this
          form is opened to real artists. Do not treat this copy as final.
        */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer',
          fontFamily: font, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.5, padding: '4px 0',
        }}>
          <input
            type="checkbox"
            checked={rightsAgreed}
            onChange={e => setRightsAgreed(e.target.checked)}
            style={{ marginTop: '3px', width: '18px', height: '18px', flexShrink: 0, accentColor: 'var(--gold)' }}
          />
          <span>
            [PLACEHOLDER] I confirm that I own the rights to any music I upload,
            or have explicit permission from the rights holder to distribute it
            on Margo, and I agree to Margo's Terms of Use and Copyright Policy.
          </span>
        </label>

        {error && <p style={{ fontFamily: font, fontSize: '0.75rem', color: '#ff6060' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !displayArtistName.trim() || !rightsAgreed}
          style={{
            width: '100%', padding: '14px', background: 'var(--gold)', color: 'var(--bg)',
            border: 'none', borderRadius: '10px', fontFamily: font, fontWeight: 700,
            fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: (loading || !displayArtistName.trim() || !rightsAgreed) ? 0.6 : 1,
            marginTop: '8px',
          }}
        >
          {loading ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
    </div>
  )
}
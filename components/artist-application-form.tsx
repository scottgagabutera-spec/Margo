'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  useArtistApplication,
  generateVerificationCode,
  type ArtistApplicationLinks,
  type ApplicantType,
} from '@/hooks/useArtistApplication'
import { normalizeSunoUrl } from '@/lib/suno'

import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

const LINK_FIELDS: { key: keyof ArtistApplicationLinks; label: string; placeholder: string }[] = [
  { key: 'spotify', label: 'Spotify', placeholder: 'open.spotify.com/artist/...' },
  { key: 'appleMusic', label: 'Apple Music', placeholder: 'music.apple.com/artist/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@yourname' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'soundcloud.com/yourname' },
  { key: 'boomplay', label: 'Boomplay', placeholder: 'boomplay.com/artists/...' },
  { key: 'audiomack', label: 'Audiomack', placeholder: 'audiomack.com/yourname' },
  { key: 'deezer', label: 'Deezer', placeholder: 'deezer.com/artist/...' },
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
  display: 'block', fontFamily: font, fontSize: '0.6rem',
  color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  letterSpacing: '1.5px', marginBottom: '6px',
}

const ghostBtn: React.CSSProperties = {
  padding: '0 16px', height: '44px', background: 'transparent', color: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
  fontFamily: font, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
}

const goldBtn: React.CSSProperties = {
  padding: '0 16px', height: '44px', background: 'var(--gold)', color: 'var(--bg)',
  border: 'none', borderRadius: '10px', fontFamily: font, fontWeight: 700,
  fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
}

interface ArtistApplicationFormProps {
  onSubmitted?: () => void
}

export function ArtistApplicationForm({ onSubmitted }: ArtistApplicationFormProps) {
  const { submitArtistApplication, verifySunoLink, importLinktree } = useArtistApplication()

  const [applicantType, setApplicantType] = useState<ApplicantType>('independent')
  const [displayArtistName, setDisplayArtistName] = useState('')
  const [links, setLinks] = useState<ArtistApplicationLinks>({})
  const [note, setNote] = useState('')
  const [rightsAgreed, setRightsAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [linktreeUrl, setLinktreeUrl] = useState('')
  const [linktreeStatus, setLinktreeStatus] = useState<{ kind: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ kind: 'idle' })

  const [sunoCode, setSunoCode] = useState<string | null>(null)
  const [sunoVerifying, setSunoVerifying] = useState(false)
  const [sunoVerified, setSunoVerified] = useState(false)
  const [sunoStatus, setSunoStatus] = useState<{ kind: 'idle' | 'error'; message?: string }>({ kind: 'idle' })

  const setLink = (key: keyof ArtistApplicationLinks, value: string) => {
    setLinks(prev => ({ ...prev, [key]: value }))
    if (key === 'suno') {
      setSunoVerified(false)
      setSunoStatus({ kind: 'idle' })
    }
  }

  // Fills in "https://suno.com/@" for whatever the artist typed the
  // moment they leave the field, so someone who just types their handle
  // ("trymargo" or "@trymargo") sees it turn into a real profile link
  // without having to know or type the full URL themselves.
  const handleSunoBlur = () => {
    if (!links.suno) return
    const normalized = normalizeSunoUrl(links.suno)
    if (normalized !== links.suno) {
      setLinks(prev => ({ ...prev, suno: normalized }))
    }
  }

  const handleImportLinktree = async () => {
    if (!linktreeUrl.trim()) return
    setLinktreeStatus({ kind: 'loading' })
    const result = await importLinktree(linktreeUrl.trim())
    if (!result.success || !result.links) {
      setLinktreeStatus({ kind: 'error', message: result.error || 'Could not import that page.' })
      return
    }
    setLinks(prev => ({ ...result.links, ...prev }))
    const count = Object.keys(result.links).length
    setLinktreeStatus({
      kind: 'success',
      message: count > 0 ? `Imported ${count} link${count === 1 ? '' : 's'} — review below.` : 'No matching links found.',
    })
  }

  const handleGetSunoCode = () => {
    setSunoCode(generateVerificationCode())
    setSunoVerified(false)
    setSunoStatus({ kind: 'idle' })
  }

  const handleVerifySuno = async () => {
    if (!links.suno || !sunoCode) return
    // Normalize right before sending, as a safety net in case blur never
    // fired (e.g. autofill, or the user clicked straight to this button).
    const normalized = normalizeSunoUrl(links.suno)
    if (normalized !== links.suno) {
      setLinks(prev => ({ ...prev, suno: normalized }))
    }
    setSunoVerifying(true)
    const result = await verifySunoLink(normalized.trim(), sunoCode)
    setSunoVerifying(false)
    if (!result.success) {
      setSunoVerified(false)
      setSunoStatus({ kind: 'error', message: result.error || "Couldn't confirm that yet — make sure the code is saved in your bio." })
      return
    }
    setSunoVerified(true)
    setSunoStatus({ kind: 'idle' })
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    // Same safety net on final submit — the stored link should always be
    // a full URL, regardless of whether the Suno field was ever blurred.
    const normalizedLinks: ArtistApplicationLinks = {
      ...links,
      suno: links.suno ? normalizeSunoUrl(links.suno) : links.suno,
    }
    const result = await submitArtistApplication({
      applicantType,
      displayArtistName,
      links: normalizedLinks,
      note,
      rightsAgreed,
      sunoVerification: sunoVerified && sunoCode ? { code: sunoCode } : null,
    })
    setLoading(false)
    if (!result.success) {
      setError(result.error || 'Something went wrong. Please try again.')
      return
    }
    onSubmitted?.()
  }

  return (
    <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>Artist</p>
        <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400, marginBottom: '10px' }}>Apply as an Artist</h1>
        <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          Tell us who you are so we can verify you and unlock independent song uploads.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>You're applying as</label>
          <select value={applicantType} onChange={e => setApplicantType(e.target.value as ApplicantType)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="independent">Independent Artist</option>
            <option value="label" disabled>Label (Coming Soon)</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Artist Name</label>
          <input type="text" value={displayArtistName} onChange={e => setDisplayArtistName(e.target.value)}
            placeholder="How you're known as an artist" style={inputStyle} />
        </div>

        <div style={{ marginTop: '6px' }}>
          <label style={labelStyle}>Already have a Linktree?</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={linktreeUrl} onChange={e => setLinktreeUrl(e.target.value)}
              placeholder="linktr.ee/yourname" style={inputStyle} />
            <button type="button" onClick={handleImportLinktree}
              disabled={!linktreeUrl.trim() || linktreeStatus.kind === 'loading'}
              style={{ ...ghostBtn, opacity: (!linktreeUrl.trim() || linktreeStatus.kind === 'loading') ? 0.5 : 1 }}>
              {linktreeStatus.kind === 'loading' ? 'Importing…' : 'Import'}
            </button>
          </div>
          {linktreeStatus.message && (
            <p style={{ fontFamily: font, fontSize: '0.65rem', marginTop: '6px', color: linktreeStatus.kind === 'error' ? '#ff6060' : '#4ade80' }}>
              {linktreeStatus.message}
            </p>
          )}
          <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>
            No Linktree? Add your links one at a time below.
          </p>
        </div>

        {applicantType === 'independent' && (
          <div style={{ padding: '16px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.15)', borderRadius: '12px' }}>
            <p style={{ fontFamily: font, fontSize: '0.75rem', color: 'var(--text)', marginBottom: '4px' }}>
              Made your music with Suno? Get approved instantly.
            </p>
            <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', lineHeight: 1.5 }}>
              Add your Suno profile, then prove it's yours by pasting a short code into your bio.
            </p>
            <label style={labelStyle}>Suno Profile</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: sunoCode ? '4px' : 0 }}>
              <input type="text" value={links.suno || ''} onChange={e => setLink('suno', e.target.value)}
                onBlur={handleSunoBlur} placeholder="@yourname" style={inputStyle} />
              {!sunoCode && (
                <button type="button" onClick={handleGetSunoCode} disabled={!links.suno?.trim()}
                  style={{ ...goldBtn, opacity: !links.suno?.trim() ? 0.5 : 1 }}>
                  Get Code
                </button>
              )}
            </div>
            <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginBottom: sunoCode ? '12px' : 0 }}>
              Just your handle works — no need to paste the full link.
            </p>
            {sunoCode && !sunoVerified && (
              <div>
                <p style={{ fontFamily: font, fontSize: '0.7rem', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.5 }}>
                  Paste this into your Suno bio, then verify:
                </p>
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', marginBottom: '10px' }}>
                  <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--gold)' }}>{sunoCode}</code>
                </div>
                <button type="button" onClick={handleVerifySuno} disabled={sunoVerifying}
                  style={{ ...goldBtn, width: '100%', opacity: sunoVerifying ? 0.6 : 1 }}>
                  {sunoVerifying ? 'Checking…' : "I've added it — Verify Now"}
                </button>
              </div>
            )}
            {sunoVerified && (
              <p style={{ fontFamily: font, fontSize: '0.7rem', color: '#4ade80' }}>✓ Verified — you can remove the code from your bio now.</p>
            )}
            {sunoStatus.kind === 'error' && sunoStatus.message && (
              <p style={{ fontFamily: font, fontSize: '0.65rem', color: '#ff6060', marginTop: '6px' }}>{sunoStatus.message}</p>
            )}
          </div>
        )}

        <div style={{ marginTop: '6px' }}>
          <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
            Your links
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {LINK_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type="text" value={links[key] || ''} onChange={e => setLink(key, e.target.value)} placeholder={placeholder} style={inputStyle} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Anything else? (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'vertical', fontFamily: font }} />
        </div>

        {/*
          Interim warranty — replace when counsel signs off final artist ToS language.
          Links to live /terms and /dmca (Copyright Policy).
        */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontFamily: font, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, padding: '4px 0' }}>
          <input type="checkbox" checked={rightsAgreed} onChange={e => setRightsAgreed(e.target.checked)}
            style={{ marginTop: '3px', width: '18px', height: '18px', flexShrink: 0, accentColor: 'var(--gold)' }} />
          <span>
            I confirm that I own or have the necessary rights to the music and content I upload, and that it does not
            infringe on any third party&apos;s copyright. I agree to Margo&apos;s{' '}
            <Link href="/terms" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Terms of Use</Link>
            {' '}and{' '}
            <Link href="/dmca" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Copyright Policy</Link>.
          </span>
        </label>

        {error && <p style={{ fontFamily: font, fontSize: '0.75rem', color: '#ff6060' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading || !displayArtistName.trim() || !rightsAgreed}
          style={{
            width: '100%', padding: '14px', background: 'var(--gold)', color: 'var(--bg)',
            border: 'none', borderRadius: '10px', fontFamily: font, fontWeight: 700,
            fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: (loading || !displayArtistName.trim() || !rightsAgreed) ? 0.6 : 1,
            marginTop: '8px',
          }}>
          {loading ? 'Submitting…' : sunoVerified ? 'Submit & Go Live Instantly' : 'Submit Application'}
        </button>
      </div>
    </div>
  )
}
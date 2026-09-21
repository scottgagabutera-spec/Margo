'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { AvatarUpload } from '@/components/avatar-upload'
import { CoverUpload } from '@/components/cover-upload'
import { SignatureSongPicker } from '@/components/signature-song-picker'
import { SignInLink } from '@/components/signin-link'
import { LoadingRing } from '@/components/loading-ring'
import { TYPE, UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import { ARTIST_LINK_FIELDS, sanitizeArtistLinks } from '@/lib/artist-links'

const font = UI_FONT
const lyricFont = LYRIC_FONT

const inputStyle: React.CSSProperties = {
  width: '100%', height: '44px', padding: '0 14px',
  background: 'var(--gold-faint)', border: '1px solid var(--border)',
  borderRadius: '12px', color: 'var(--text)', fontFamily: font,
  fontSize: TYPE.body, outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: font, fontSize: TYPE.label, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: '8px', fontWeight: 700,
}

const helpStyle: React.CSSProperties = {
  fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', marginTop: '6px',
}

export default function EditProfilePage() {
  const router = useRouter()
  const {
    user, identity, loading,
    updateDisplayName, changeUsername, updateBio, updateSignatureLyric, setPrivate,
    updateArtistLinks, syncAvatarUrl, syncCoverUrl,
  } = useIdentity()
  const { requireAuth } = useAuthGate()

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => identity?.avatarUrl ?? null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [lyric, setLyric] = useState('')
  const [song, setSong] = useState('')
  const [artist, setArtist] = useState('')
  const [catalogSongId, setCatalogSongId] = useState<string | null>(null)
  const [isPrivate, setIsPrivateLocal] = useState(false)
  const [artistLinkDraft, setArtistLinkDraft] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stay here and open the auth gate so a successful sign-in returns to edit.
  useEffect(() => {
    if (!loading && !user) {
      requireAuth({ returnTo: '/profile/edit' })
    }
  }, [loading, user, requireAuth])

  // Seed local form state once identity resolves. Runs again if identity
  // changes underneath us (e.g. another tab updated it).
  useEffect(() => {
    if (identity) {
      setAvatarUrl(identity.avatarUrl ?? null)
      setDisplayName(identity.displayName || '')
      setUsername(identity.username || '')
      setBio(identity.bio || '')
      setLyric(identity.signatureLyric || '')
      setSong(identity.signatureSong || '')
      setArtist(identity.signatureArtist || '')
      setCatalogSongId(identity.signatureSongId ?? null)
      setIsPrivateLocal(identity.isPrivate)
      const seeded: Record<string, string> = {}
      for (const field of ARTIST_LINK_FIELDS) {
        seeded[field.key] = identity.artistLinks?.[field.key] || ''
      }
      setArtistLinkDraft(seeded)
    }
  }, [identity])

  const handleSave = useCallback(async () => {
    if (!identity) return
    setSaving(true)
    setError(null)

    // Only fire the mutations for fields that actually changed — each
    // is a separate Supabase update via useIdentity, no batched endpoint.
    // Avatar is excluded here: it saves itself the moment a photo is chosen
    // (see AvatarUpload's onUploaded), not on this button.
    const tasks: Promise<{ success: boolean; error?: string }>[] = []

    // Capture the username this save will land on — either the newly
    // typed one (if changed) or the current one — so the post-save
    // redirect goes to the right profile even if the handle just changed.
    const usernameChanged = username.trim() && username.trim().toLowerCase() !== identity.username
    const destinationUsername = usernameChanged ? username.trim().toLowerCase() : identity.username

    if (displayName.trim() && displayName.trim() !== identity.displayName) {
      tasks.push(updateDisplayName(displayName))
    }
    if (usernameChanged) {
      tasks.push(changeUsername(username))
    }
    if (bio !== (identity.bio || '')) {
      tasks.push(updateBio(bio))
    }
    if (
      lyric !== (identity.signatureLyric || '') ||
      song !== (identity.signatureSong || '') ||
      artist !== (identity.signatureArtist || '') ||
      (catalogSongId || null) !== (identity.signatureSongId || null)
    ) {
      tasks.push(updateSignatureLyric({ lyric, song, artist, songId: catalogSongId }))
    }
    if (isPrivate !== identity.isPrivate) {
      tasks.push(setPrivate(isPrivate))
    }
    if (identity.isArtist) {
      const next = sanitizeArtistLinks(artistLinkDraft)
      const prev = sanitizeArtistLinks(identity.artistLinks)
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        tasks.push(updateArtistLinks(artistLinkDraft))
      }
    }

    if (tasks.length === 0) {
      router.push(`/profile/${destinationUsername}`)
      return
    }

    const results = await Promise.all(tasks)
    const failed = results.find(r => !r.success)
    if (failed) {
      setSaving(false)
      setError(failed.error || 'Something went wrong saving your profile.')
    } else {
      router.push(`/profile/${destinationUsername}`)
    }
  }, [identity, displayName, username, bio, lyric, song, artist, catalogSongId, isPrivate, artistLinkDraft, updateDisplayName, changeUsername, updateBio, updateSignatureLyric, setPrivate, updateArtistLinks, router])

  if (!loading && !user) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{
          maxWidth: '420px',
          margin: '0 auto',
          padding: 'calc(var(--nav-height, 72px) + 48px) 24px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: lyricFont,
            fontStyle: 'italic',
            fontSize: TYPE.lyric,
            color: 'var(--text-secondary)',
            marginBottom: '16px',
          }}>
            Sign in to edit your profile
          </p>
          <SignInLink
            returnTo="/profile/edit"
            style={{
              padding: '10px 24px',
              border: '1px solid var(--border)',
              borderRadius: '50px',
              color: 'var(--text-secondary)',
              fontFamily: font,
              fontSize: TYPE.label,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Sign In
          </SignInLink>
        </div>
      </main>
    )
  }

  if (loading || !identity) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '160px 0' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{ position: 'fixed', top: '20%', left: '20%', width: '320px', height: '320px', background: 'var(--gold-glow)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ paddingTop: 'calc(var(--nav-height, 72px) + 24px)', paddingBottom: 'var(--margo-page-padding-bottom)', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontFamily: font, fontSize: TYPE.pageTitle, fontWeight: 600, color: 'var(--gold)', marginBottom: '8px' }}>Edit Profile</h1>
            <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>How you show up on Margo</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
              <AvatarUpload
                currentAvatarUrl={avatarUrl ?? identity.avatarUrl ?? null}
                displayName={displayName || identity.displayName || ''}
                onUploaded={(url) => {
                  setAvatarUrl(url)
                  syncAvatarUrl(url)
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>Cover</label>
              <CoverUpload
                currentCoverUrl={identity.coverUrl ?? null}
                onUploaded={(url) => syncCoverUrl(url)}
              />
            </div>

            <div>
              <label style={labelStyle}>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value.slice(0, 30))}
                style={inputStyle}
                maxLength={30}
              />
            </div>

            <div>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontFamily: font, color: 'var(--text-secondary)', fontSize: TYPE.body }}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                  style={{ ...inputStyle, paddingLeft: '30px' }}
                />
              </div>
              <p style={helpStyle}>
                Lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div>
              <label style={labelStyle}>Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 160))}
                rows={3}
                placeholder="Tell people what Margo means to you..."
                style={{ ...inputStyle, height: 'auto', padding: '14px 16px', resize: 'none', lineHeight: 1.5 }}
              />
              <p style={{ ...helpStyle, color: 'var(--text-muted)', textAlign: 'right' }}>
                {bio.length}/160
              </p>
            </div>

            {identity.isArtist && (
              <div>
                <label style={labelStyle}>Social &amp; streaming</label>
                <p style={{ ...helpStyle, marginTop: 0, marginBottom: '14px', lineHeight: 1.5 }}>
                  Full URL or @handle. These show on your public profile.
                </p>
                {(['social', 'streaming', 'hub'] as const).map((group) => (
                  <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: group === 'hub' ? 0 : '16px' }}>
                    {ARTIST_LINK_FIELDS.filter((f) => f.group === group).map((field) => (
                      <div key={field.key}>
                        <label style={{ ...labelStyle, color: 'var(--text-secondary)' }}>{field.label}</label>
                        <input
                          type="text"
                          value={artistLinkDraft[field.key] || ''}
                          onChange={(e) => setArtistLinkDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          style={inputStyle}
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '16px', padding: '20px' }}>
              <label style={{ ...labelStyle, marginBottom: '8px' }}>Signature lyric</label>
              <p style={{ ...helpStyle, marginTop: 0, marginBottom: '16px' }}>
                The line that says it about you. Attach a song from Margo so it can play on your profile.
              </p>
              <textarea
                value={lyric}
                onChange={e => setLyric(e.target.value.slice(0, 140))}
                rows={2}
                placeholder="The lyric that says it best..."
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                  fontFamily: lyricFont, fontStyle: 'italic', fontSize: TYPE.lyric, color: 'var(--gold)',
                  lineHeight: 1.5, marginBottom: '16px', boxSizing: 'border-box',
                }}
              />
              <SignatureSongPicker
                songTitle={song}
                artistName={artist}
                catalogSongId={catalogSongId}
                onChange={({ song: nextSong, artist: nextArtist, catalogSongId: nextId }) => {
                  setSong(nextSong)
                  setArtist(nextArtist)
                  setCatalogSongId(nextId)
                }}
              />
              {!catalogSongId && (
                <div style={{ marginTop: '16px' }}>
                  <p style={{ ...labelStyle, color: 'var(--text-secondary)' }}>Not on Margo yet</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input
                      type="text" value={song} onChange={e => { setSong(e.target.value); setCatalogSongId(null) }} placeholder="Song"
                      style={{ ...inputStyle, background: 'var(--surface)', height: '44px' }}
                    />
                    <input
                      type="text" value={artist} onChange={e => { setArtist(e.target.value); setCatalogSongId(null) }} placeholder="Artist"
                      style={{ ...inputStyle, background: 'var(--surface)', height: '44px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 20px',
            }}>
              <div>
                <p style={{ fontFamily: font, fontSize: TYPE.body, color: 'var(--text)', marginBottom: '4px' }}>Private profile</p>
                <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>Only approved followers can see your lyrics.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPrivate}
                aria-label="Toggle private profile"
                onClick={() => setIsPrivateLocal(v => !v)}
                style={{
                  position: 'relative', width: '52px', height: 'var(--margo-touch-min)',
                  background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
                  width: '52px', height: '30px', borderRadius: '20px',
                  background: isPrivate ? 'var(--gold)' : 'var(--surface-3)',
                  transition: 'background 200ms ease',
                }} />
                <span style={{
                  position: 'absolute', top: '50%', left: isPrivate ? '25px' : '3px',
                  transform: 'translateY(-50%)', width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--bg)', transition: 'left 200ms ease',
                }} />
              </button>
            </div>

            {error && (
              <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)', textAlign: 'center' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                onClick={() => router.push(`/profile/${identity.username}`)}
                style={{
                  minHeight: 'var(--margo-touch-min)', padding: '0 24px',
                  display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                  background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-hi)',
                  borderRadius: '50px', fontFamily: font, fontWeight: 600, fontSize: TYPE.label,
                  letterSpacing: '1.2px', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  minHeight: 'var(--margo-touch-min)', padding: '0 32px',
                  display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                  background: 'var(--gold)', color: 'var(--bg)', border: 'none',
                  borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: TYPE.label,
                  letterSpacing: '1.2px', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 28px var(--gold-glow)', opacity: saving ? 0.7 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >{saving ? 'Saving' : 'Save'}</button>
            </div>
          </div>
        </div>
      </div>
      {saving && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'var(--margo-scrim)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <LoadingRing size={44} strokeWidth={2} state="spinning" />
          <p style={{
            fontFamily: font,
            fontSize: TYPE.label,
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            margin: 0,
          }}>
            Saving
          </p>
        </div>
      )}
    </main>
  )
}

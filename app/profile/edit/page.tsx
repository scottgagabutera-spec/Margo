'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MargoNav } from '@/components/margo-nav'
import { useIdentity } from '@/hooks/useIdentity'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { AvatarUpload } from '@/components/avatar-upload'

const font = 'var(--font-lora), serif'

const inputStyle: React.CSSProperties = {
  width: '100%', height: '48px', padding: '0 16px',
  background: 'var(--gold-faint)', border: '1px solid var(--border)',
  borderRadius: '12px', color: 'var(--text)', fontFamily: font,
  fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: font, fontSize: '0.875rem', color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px',
}

export default function EditProfilePage() {
  const router = useRouter()
  const {
    user, identity, loading,
    updateDisplayName, changeUsername, updateBio, updateSignatureLyric, setPrivate,
  } = useIdentity()
  const { requireAuth } = useAuthGate()

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [lyric, setLyric] = useState('')
  const [song, setSong] = useState('')
  const [artist, setArtist] = useState('')
  const [isPrivate, setIsPrivateLocal] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // This page has nothing to show without an identity — bounce signed-out
  // visitors back and prompt auth rather than rendering an empty form.
  useEffect(() => {
    if (!loading && !user) {
      requireAuth()
      router.replace('/feed')
    }
  }, [loading, user, requireAuth, router])

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
      setIsPrivateLocal(identity.isPrivate)
    }
  }, [identity])

  const handleSave = useCallback(async () => {
    if (!identity) return
    setSaving(true)
    setError(null)
    setSaved(false)

    // Only fire the mutations for fields that actually changed — each
    // is a separate Supabase update via useIdentity, no batched endpoint.
    // Avatar is excluded here: it saves itself the moment a photo is chosen
    // (see AvatarUpload's onUploaded), not on this button.
    const tasks: Promise<{ success: boolean; error?: string }>[] = []

    if (displayName.trim() && displayName.trim() !== identity.displayName) {
      tasks.push(updateDisplayName(displayName))
    }
    if (username.trim() && username.trim().toLowerCase() !== identity.username) {
      tasks.push(changeUsername(username))
    }
    if (bio !== (identity.bio || '')) {
      tasks.push(updateBio(bio))
    }
    if (
      lyric !== (identity.signatureLyric || '') ||
      song !== (identity.signatureSong || '') ||
      artist !== (identity.signatureArtist || '')
    ) {
      tasks.push(updateSignatureLyric({ lyric, song, artist }))
    }
    if (isPrivate !== identity.isPrivate) {
      tasks.push(setPrivate(isPrivate))
    }

    if (tasks.length === 0) {
      setSaving(false)
      setSaved(true)
      return
    }

    const results = await Promise.all(tasks)
    const failed = results.find(r => !r.success)
    setSaving(false)
    if (failed) {
      setError(failed.error || 'Something went wrong saving your profile.')
    } else {
      setSaved(true)
    }
  }, [identity, displayName, username, bio, lyric, song, artist, isPrivate, updateDisplayName, changeUsername, updateBio, updateSignatureLyric, setPrivate])

  if (loading || !identity) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <MargoNav />
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
      <MargoNav />
      <div style={{ position: 'fixed', top: '20%', left: '20%', width: '320px', height: '320px', background: 'rgba(232,197,71,0.05)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ paddingTop: '120px', paddingBottom: 'var(--margo-page-padding-bottom)', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontFamily: font, fontStyle: 'italic', fontSize: '2rem', color: 'var(--gold)', marginBottom: '8px' }}>Edit Profile</h1>
            <p style={{ fontFamily: font, fontSize: '0.95rem', color: 'var(--text-3)' }}>How you show up on Margo</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                displayName={displayName || identity.displayName || ''}
                onUploaded={(url) => setAvatarUrl(url)}
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
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontFamily: font, color: 'var(--text-3)', fontSize: '1rem' }}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                  style={{ ...inputStyle, paddingLeft: '30px' }}
                />
              </div>
              <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '6px' }}>
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
              <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '6px', textAlign: 'right' }}>
                {bio.length}/160
              </p>
            </div>

            <div style={{ background: 'var(--gold-faint)', border: '1px solid var(--gold-border)', borderRadius: '16px', padding: '20px' }}>
              <label style={{ ...labelStyle, marginBottom: '16px' }}>Signature Lyric</label>
              <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '-8px', marginBottom: '16px' }}>
                The line that says it about you — not tied to any post.
              </p>
              <textarea
                value={lyric}
                onChange={e => setLyric(e.target.value.slice(0, 140))}
                rows={2}
                placeholder="The lyric that says it best..."
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                  fontFamily: font, fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--gold)',
                  lineHeight: 1.5, marginBottom: '16px', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input
                  type="text" value={song} onChange={e => setSong(e.target.value)} placeholder="Song"
                  style={{ ...inputStyle, background: 'var(--surface)', height: '44px' }}
                />
                <input
                  type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist"
                  style={{ ...inputStyle, background: 'var(--surface)', height: '44px' }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 20px',
            }}>
              <div>
                <p style={{ fontFamily: font, fontSize: '1rem', color: 'var(--text)', marginBottom: '4px' }}>Private Profile</p>
                <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-3)' }}>Only approved followers can see your posts.</p>
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
              <p style={{ fontFamily: font, fontSize: '0.9rem', color: '#ff6b6b', textAlign: 'center' }}>{error}</p>
            )}
            {saved && !error && (
              <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--gold)', textAlign: 'center' }}>Profile saved.</p>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                onClick={() => router.push(`/profile/${identity.username}`)}
                style={{
                  minHeight: 'var(--margo-touch-min)', padding: '0 24px',
                  display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                  background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border-hi)',
                  borderRadius: '50px', fontFamily: font, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  minHeight: 'var(--margo-touch-min)', padding: '0 32px',
                  display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                  background: 'var(--gold)', color: 'var(--bg)', border: 'none',
                  borderRadius: '50px', fontFamily: font, fontWeight: 700, fontSize: '0.95rem',
                  letterSpacing: '0.5px', cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 28px rgba(232,197,71,0.28)', opacity: saving ? 0.7 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
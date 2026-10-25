'use client'
import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { MargoActionSheet } from '@/components/margo-action-sheet'
import { useRouter } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { AvatarUpload } from '@/components/avatar-upload'
import { CoverUpload } from '@/components/cover-upload'
import { SignatureSongPicker } from '@/components/signature-song-picker'
import { CatalogPickLyricField } from '@/components/catalog-pick-lyric-field'
import { SignInLink } from '@/components/signin-link'
import { LoadingRing } from '@/components/loading-ring'
import { TYPE, UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import { ARTIST_LINK_FIELDS, sanitizeArtistLinks } from '@/lib/artist-links'
import {
  clearProfileEditDraft,
  readProfileEditDraft,
  writeProfileEditDraft,
} from '@/lib/profile-edit-draft'
import { profileEditHasUnsavedChanges } from '@/lib/profile-edit-unsaved'
import { useProfileEditLeaveGuard } from '@/hooks/useProfileEditLeaveGuard'
import { EditProfilePageSkeleton } from '@/components/margo-skeletons'
import { UsernameFieldShell } from '@/components/username-field-shell'
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability'
import {
  normalizeUsernameInput,
  USERNAME_MAX_LENGTH,
  validateUsernameChoice,
} from '@/lib/username-validator'

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

function EditProfilePageInner() {
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
  const [signatureSheetOpen, setSignatureSheetOpen] = useState(false)
  const [signatureLinePickerOpen, setSignatureLinePickerOpen] = useState(false)
  const lyricInputRef = useRef<HTMLTextAreaElement>(null)
  const signatureSectionRef = useRef<HTMLDivElement>(null)
  /** Seed form once per mount — identity refresh must not reset typed fields. */
  const formSeededRef = useRef(false)
  const usernameAvailability = useUsernameAvailability(
    username,
    identity?.username ?? null,
    user?.id ?? null,
  )

  const usernameValidation = useMemo(
    () => validateUsernameChoice(username, identity?.username ?? null),
    [username, identity?.username],
  )

  const usernameChangedForSave = useMemo(() => {
    if (!identity) return false
    const next = normalizeUsernameInput(username)
    return next.length > 0 && next !== normalizeUsernameInput(identity.username)
  }, [username, identity])

  const usernameBlocksSave =
    usernameChangedForSave
    && (!usernameValidation.ok
      || usernameAvailability === 'checking'
      || usernameAvailability === 'taken'
      || usernameAvailability === 'invalid')

  const persistDraftNow = useCallback(() => {
    if (!user?.id) return
    writeProfileEditDraft(user.id, {
      displayName,
      username,
      bio,
      lyric,
      song,
      artist,
      catalogSongId,
      isPrivate,
      artistLinkDraft,
    })
  }, [user?.id, displayName, username, bio, lyric, song, artist, catalogSongId, isPrivate, artistLinkDraft])

  // Stay here and open the auth gate so a successful sign-in returns to edit.
  useEffect(() => {
    if (!loading && !user) {
      requireAuth({ returnTo: '/profile/edit' })
    }
  }, [loading, user, requireAuth])

  useEffect(() => {
    if (!identity || !user?.id) return
    if (formSeededRef.current) {
      setAvatarUrl(identity.avatarUrl ?? null)
      return
    }
    formSeededRef.current = true
    const draft = readProfileEditDraft(user.id)
    setAvatarUrl(identity.avatarUrl ?? null)
    setDisplayName(draft?.displayName ?? (identity.displayName || ''))
    setUsername(draft?.username ?? (identity.username || ''))
    setBio(draft?.bio ?? (identity.bio || ''))
    setLyric(draft?.lyric ?? (identity.signatureLyric || ''))
    setSong(draft?.song ?? (identity.signatureSong || ''))
    setArtist(draft?.artist ?? (identity.signatureArtist || ''))
    setCatalogSongId(draft?.catalogSongId ?? identity.signatureSongId ?? null)
    setIsPrivateLocal(draft?.isPrivate ?? identity.isPrivate)
    const seeded: Record<string, string> = {}
    for (const field of ARTIST_LINK_FIELDS) {
      seeded[field.key] = draft?.artistLinkDraft?.[field.key] ?? (identity.artistLinks?.[field.key] || '')
    }
    setArtistLinkDraft(seeded)
  }, [identity, user?.id])

  useEffect(() => {
    if (!user?.id || !formSeededRef.current) return
    const timer = window.setTimeout(() => persistDraftNow(), 400)
    return () => window.clearTimeout(timer)
  }, [user?.id, persistDraftNow])

  useEffect(() => {
    if (!user?.id) return
    const persist = () => {
      if (document.visibilityState === 'hidden') persistDraftNow()
    }
    document.addEventListener('visibilitychange', persist)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', persist)
      window.removeEventListener('pagehide', persist)
    }
  }, [user?.id, persistDraftNow])

  const hasUnsavedChanges = useMemo(() => {
    if (!identity || !formSeededRef.current) return false
    return profileEditHasUnsavedChanges(identity, {
      displayName,
      username,
      bio,
      lyric,
      song,
      artist,
      catalogSongId,
      isPrivate,
      artistLinkDraft,
    })
  }, [identity, displayName, username, bio, lyric, song, artist, catalogSongId, isPrivate, artistLinkDraft])

  useProfileEditLeaveGuard(hasUnsavedChanges)

  const handleSave = useCallback(async () => {
    if (!identity) return
    if (usernameBlocksSave) return
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
    const cleanedUsername = normalizeUsernameInput(username)
    const usernameChanged =
      cleanedUsername.length > 0 && cleanedUsername !== normalizeUsernameInput(identity.username)
    const destinationUsername = usernameChanged ? cleanedUsername : identity.username

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
      if (user?.id) clearProfileEditDraft(user.id)
      router.push(`/profile/${destinationUsername}`)
    }
  }, [identity, user?.id, displayName, username, bio, lyric, song, artist, catalogSongId, isPrivate, artistLinkDraft, usernameBlocksSave, updateDisplayName, changeUsername, updateBio, updateSignatureLyric, setPrivate, updateArtistLinks, router])

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

  const showBootSpinner = (loading && !identity) || (!user && loading)

  if (showBootSpinner) {
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

  if (!identity) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)' }}>
            Could not load your profile. Pull to refresh or try again.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ paddingTop: 'calc(var(--nav-height, 72px) + 8px)', paddingBottom: 'var(--margo-page-padding-bottom)', paddingLeft: '20px', paddingRight: '20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            minHeight: 'var(--margo-touch-min)',
            margin: '0 0 12px',
          }}>
            <h1 style={{
              fontFamily: font,
              fontSize: TYPE.label,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              margin: 0,
            }}>
              Edit profile
            </h1>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || usernameBlocksSave}
              style={{
                minHeight: 'var(--margo-touch-min)',
                padding: '0 4px',
                background: 'none',
                border: 'none',
                cursor: saving || usernameBlocksSave ? 'not-allowed' : 'pointer',
                fontFamily: font,
                fontSize: TYPE.label,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                opacity: saving || usernameBlocksSave ? 0.45 : 1,
              }}
            >
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <AvatarUpload
                currentAvatarUrl={avatarUrl ?? identity.avatarUrl ?? null}
                displayName={displayName || identity.displayName || ''}
                onBeforePick={persistDraftNow}
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
                onBeforePick={persistDraftNow}
                onUploaded={(url) => syncCoverUrl(url)}
              />
            </div>

            <div>
              <label style={labelStyle}>Name</label>
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
              <UsernameFieldShell
                visualState={usernameAvailability}
                showFeedback={usernameChangedForSave}
                statusId="profile-edit-username-status"
                data-margo-username-status={usernameAvailability}
              >
                <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontFamily: font, color: 'var(--text-secondary)', fontSize: TYPE.body, zIndex: 1 }}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(normalizeUsernameInput(e.target.value))}
                  style={{
                    ...inputStyle,
                    paddingLeft: '30px',
                    border: 'none',
                    background: 'transparent',
                  }}
                  maxLength={USERNAME_MAX_LENGTH}
                  aria-describedby="profile-edit-username-status"
                />
                </div>
              </UsernameFieldShell>
            </div>

            <div>
              <label style={labelStyle}>Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 160))}
                rows={3}
                style={{ ...inputStyle, height: 'auto', padding: '14px 16px', resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            {identity.isArtist && ARTIST_LINK_FIELDS.map((field) => (
              <div key={field.key}>
                <label style={labelStyle}>{field.label}</label>
                <input
                  type="text"
                  value={artistLinkDraft[field.key] || ''}
                  onChange={(e) => setArtistLinkDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  style={inputStyle}
                  autoComplete="off"
                />
              </div>
            ))}

            <div id="signature" ref={signatureSectionRef}>
              <label style={labelStyle}>Signature</label>
              <CatalogPickLyricField
                variant="signature"
                textareaRef={lyricInputRef}
                value={lyric}
                catalogPickOnly={!!catalogSongId}
                onOpenPicker={() => setSignatureLinePickerOpen(true)}
                onValueChange={setLyric}
                rows={2}
              />
              <SignatureSongPicker
                songTitle={song}
                artistName={artist}
                catalogSongId={catalogSongId}
                currentLyric={lyric}
                linePickerOpen={signatureLinePickerOpen}
                onLinePickerOpenChange={setSignatureLinePickerOpen}
                onChange={({ song: nextSong, artist: nextArtist, catalogSongId: nextId }) => {
                  setSong(nextSong)
                  setArtist(nextArtist)
                  setCatalogSongId(nextId)
                  if (nextId) setSignatureLinePickerOpen(true)
                }}
                onLyricPick={(text) => setLyric(text)}
              />
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: 'var(--margo-touch-min)',
            }}>
              <p style={{
                fontFamily: font,
                fontSize: TYPE.label,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                margin: 0,
              }}>Private</p>
              <button
                type="button"
                role="switch"
                aria-checked={isPrivate}
                aria-label="Private"
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
          </div>
        </div>
      </div>
      <MargoActionSheet
        open={signatureSheetOpen}
        onOpenChange={setSignatureSheetOpen}
        title="Signature lyric"
        message={lyric.trim() ? `\u201C${lyric.trim()}\u201D` : 'Choose what to do with your signature.'}
        actions={[
          {
            id: 'edit',
            label: 'Edit lyric text',
            onSelect: () => {
              lyricInputRef.current?.focus()
            },
          },
          {
            id: 'replace',
            label: 'Replace song or line',
            onSelect: () => {
              signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            },
          },
          {
            id: 'remove',
            label: 'Remove signature',
            tone: 'destructive',
            onSelect: () => {
              setLyric('')
              setSong('')
              setArtist('')
              setCatalogSongId(null)
            },
          },
          {
            id: 'cancel',
            label: 'Cancel',
            tone: 'cancel',
            onSelect: () => {},
          },
        ]}
      />
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

export default function EditProfilePage() {
  return (
    <Suspense fallback={<EditProfilePageSkeleton />}>
      <EditProfilePageInner />
    </Suspense>
  )
}

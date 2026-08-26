'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { SongUploadForm } from '@/components/studio/song-upload-form'
import { BackButton } from '@/components/back-button'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()
const font = UI_FONT

interface StudioSong {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  status: 'draft' | 'processing' | 'live' | 'coming_soon' | 'hidden'
  created_at: string
}

interface SongStat {
  song_id: string
  plays: number
  resonate_count: number
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 3v14M3 10h14" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PauseCircleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="var(--text-muted)" strokeWidth="1.5" />
      <rect x="9" y="8" width="2" height="8" rx="1" fill="var(--text-muted)" />
      <rect x="13" y="8" width="2" height="8" rx="1" fill="var(--text-muted)" />
    </svg>
  )
}

function statusLabel(status: StudioSong['status']) {
  switch (status) {
    case 'processing': return 'Processing'
    case 'coming_soon': return 'Coming Soon'
    case 'hidden': return 'Hidden'
    case 'draft': return 'Draft'
    default: return null
  }
}

export default function StudioPage() {
  const { user, identity, loading: identityLoading } = useIdentity()
  const [songs, setSongs] = useState<StudioSong[]>([])
  const [stats, setStats] = useState<Record<string, SongStat>>({})
  const [songsLoading, setSongsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [editingSongId, setEditingSongId] = useState<string | null>(null)

  const userId = user?.id ?? null

  const loadSongs = useCallback(async () => {
    if (!userId) {
      setSongsLoading(false)
      return
    }
    setSongsLoading(true)

    const { data: songRows } = await supabase
      .from('songs')
      .select('id, title, artist_display_name, artwork_url, status, created_at')
      .eq('owner_profile_id', userId)
      .order('created_at', { ascending: false })

    const list = (songRows || []) as StudioSong[]
    setSongs(list)

    if (list.length > 0) {
      const { data: statRows } = await supabase
        .from('song_stats')
        .select('song_id, plays, resonate_count')
        .in('song_id', list.map(s => s.id))

      const statMap: Record<string, SongStat> = {}
      ;(statRows || []).forEach((s: SongStat) => { statMap[s.song_id] = s })
      setStats(statMap)
    } else {
      setStats({})
    }
    setSongsLoading(false)
  }, [userId])

  // FIX: songs were only ever loaded gated on identity?.isArtist, with
  // no check on artist_status — a frozen or removed artist's uploaded
  // catalog would still load normally here, and (more importantly, see
  // the gate below) they could still upload new songs while suspended.
  const isActiveArtist = identity?.isArtist && (identity.artistStatus === 'active' || identity.artistStatus === 'warned' || !identity.artistStatus)

  useEffect(() => {
    if (isActiveArtist) loadSongs()
    else setSongsLoading(false)
  }, [isActiveArtist, loadSongs])

  const handleUploadComplete = () => {
    setShowUpload(false)
    setEditingSongId(null)
    loadSongs()
  }

  const totalPlays = Object.values(stats).reduce((sum, s) => sum + (s.plays || 0), 0)
  const totalResonates = Object.values(stats).reduce((sum, s) => sum + (s.resonate_count || 0), 0)

  if (identityLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: font, color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!identity?.isArtist) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)', textAlign: 'center' }}>
          <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Studio
          </p>
          <h1 style={{ fontFamily: font, fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', color: 'var(--text)', fontWeight: 700, marginBottom: '16px', lineHeight: 1.3 }}>
            Your songs, straight to Margo.
          </h1>
          <p style={{ fontFamily: font, fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '32px' }}>
            Apply as an artist to publish your own songs — audio, artwork, and synced lyrics, live the moment you hit publish.
          </p>
          <Link href="/apply-artist" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '48px', padding: '14px 24px',
            background: 'var(--gold)', color: 'var(--bg)',
            fontFamily: font, fontWeight: 700, fontSize: '0.7rem',
            letterSpacing: '1.5px', textTransform: 'uppercase',
            borderRadius: '50px', textDecoration: 'none',
          }}>
            Apply as an Artist
          </Link>
        </div>
      </div>
    )
  }

  // FIX: a frozen or removed artist previously hit the exact same fully
  // functional Studio as an active one — is_artist stays true through a
  // freeze/removal, so the old `!identity?.isArtist` gate never caught
  // it. This is the actual enforcement point for those moderation
  // states; without it, freezing or removing an artist in Admin had no
  // real effect on their ability to keep uploading.
  if (identity.artistStatus === 'frozen' || identity.artistStatus === 'removed') {
    const isRemoved = identity.artistStatus === 'removed'
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <PauseCircleIcon />
          </div>
          <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Studio
          </p>
          <h1 style={{ fontFamily: font, fontSize: '1.4rem', color: 'var(--text)', fontWeight: 400, marginBottom: '12px' }}>
            {isRemoved ? 'Studio access has been removed' : 'Studio access is temporarily paused'}
          </h1>
          <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            {isRemoved
              ? "Your artist standing on Margo has been removed. If you think this is a mistake, reach out to us."
              : "Your artist standing is on hold. Your songs are hidden from public view while your account is under review, and new uploads are paused until this is resolved."}
          </p>
          <Link href={`/profile/${identity.username}`} style={{
            fontFamily: font, fontSize: '0.75rem', color: 'var(--gold)', textDecoration: 'none',
          }}>
            Back to your profile →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <BackButton fallbackHref="/feed" />
          <div>
            <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Margo
            </p>
            <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>
              Studio
            </h1>
          </div>
        </div>

        {!songsLoading && songs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
            {[
              ['Songs', songs.length],
              ['Plays', totalPlays],
              ['Resonates', totalResonates],
            ].map(([label, val]) => (
              <div key={label as string} style={{
                textAlign: 'center', padding: '16px 8px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
              }}>
                <p style={{ fontFamily: font, fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)' }}>{val}</p>
                <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {showUpload && (
          <div style={{ marginBottom: '32px' }}>
            <SongUploadForm
              key={editingSongId ?? 'new'}
              artistDisplayName={identity.displayName}
              songId={editingSongId}
              onComplete={handleUploadComplete}
              onCancel={() => { setShowUpload(false); setEditingSongId(null) }}
            />
          </div>
        )}

        {!showUpload && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px',
          }}>
            <button
              onClick={() => { setEditingSongId(null); setShowUpload(true) }}
              aria-label="Upload a song"
              style={{
                aspectRatio: '1 / 1', borderRadius: '16px',
                border: '1.5px dashed var(--gold-border)', background: 'var(--gold-faint)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
                cursor: 'pointer', transition: 'transform 150ms ease, background 150ms ease',
              }}
            >
              <PlusIcon />
              <span style={{ fontFamily: font, fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>
                Upload
              </span>
            </button>

            {songsLoading && (
              <div style={{
                aspectRatio: '1 / 1', borderRadius: '16px', background: 'var(--surface-2)',
              }} />
            )}

            {songs.map(song => {
              const stat = stats[song.id]
              const label = statusLabel(song.status)
              return (
                <button
                  type="button"
                  key={song.id}
                  onClick={() => { setEditingSongId(song.id); setShowUpload(true) }}
                  aria-label={`Edit ${song.title}`}
                  style={{
                  position: 'relative', aspectRatio: '1 / 1', borderRadius: '16px',
                  overflow: 'hidden', background: 'var(--surface-2)',
                  opacity: song.status === 'hidden' ? 0.5 : 1,
                  border: 'none', padding: 0, cursor: 'pointer',
                  width: '100%', textAlign: 'left',
                  minHeight: 'var(--margo-touch-min)',
                }}>
                  {song.artwork_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={song.artwork_url} alt="" style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                    }} />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(7,6,10,0.92) 0%, rgba(7,6,10,0.25) 55%, rgba(7,6,10,0) 75%)',
                  }} />
                  {label && (
                    <span style={{
                      position: 'absolute', top: '10px', right: '10px',
                      fontFamily: font, fontSize: '0.6rem', fontWeight: 700,
                      color: 'var(--text)', background: 'rgba(7,6,10,0.7)',
                      padding: '4px 8px', borderRadius: '50px',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      {label}
                    </span>
                  )}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px' }}>
                    <p style={{
                      fontFamily: font, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)',
                      marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                      lineHeight: 1.25,
                    }}>
                      {song.title}
                    </p>
                    <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {stat ? `${stat.plays} plays · ${stat.resonate_count} resonates` : '—'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {!songsLoading && songs.length === 0 && !showUpload && (
          <p style={{
            fontFamily: font, fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-secondary)',
            textAlign: 'center', marginTop: '16px',
          }}>
            No songs yet — upload your first.
          </p>
        )}
      </div>
    </div>
  )
}
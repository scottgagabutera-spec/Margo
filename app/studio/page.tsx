'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'
import { SongUploadForm } from '@/components/studio/song-upload-form'
import { BackButton } from '@/components/back-button'

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

// Inline SVG — never Unicode, per brand system Rule 1
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function statusLabel(status: StudioSong['status']) {
  switch (status) {
    case 'live': return 'Live'
    case 'processing': return 'Processing'
    case 'coming_soon': return 'Coming Soon'
    case 'hidden': return 'Hidden'
    default: return 'Draft'
  }
}

function statusColor(status: StudioSong['status']) {
  switch (status) {
    case 'live': return 'var(--gold)'
    case 'processing': return 'var(--text-2)'
    default: return 'var(--text-3)'
  }
}

export default function StudioPage() {
  const { identity, loading: identityLoading } = useIdentity()
  const [songs, setSongs] = useState<StudioSong[]>([])
  const [stats, setStats] = useState<Record<string, SongStat>>({})
  const [songsLoading, setSongsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  const loadSongs = useCallback(async () => {
    setSongsLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData?.user?.id
    if (!uid) { setSongsLoading(false); return }

    const { data: songRows } = await supabase
      .from('songs')
      .select('id, title, artist_display_name, artwork_url, status, created_at')
      .eq('owner_profile_id', uid)
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
    }
    setSongsLoading(false)
  }, [])

  useEffect(() => {
    if (identity?.isArtist) loadSongs()
    else setSongsLoading(false)
  }, [identity?.isArtist, loadSongs])

  const handleUploadComplete = () => {
    setShowUpload(false)
    loadSongs()
  }

  if (identityLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', color: 'var(--text-3)' }}>Loading…</p>
      </div>
    )
  }

  if (!identity?.isArtist) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '120px 24px 80px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '16px' }}>
            Studio
          </p>
          <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', color: 'var(--text)', fontWeight: 700, marginBottom: '16px', lineHeight: 1.3 }}>
            Your songs, straight to Margo.
          </h1>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '32px' }}>
            Apply as an artist to publish your own catalog — audio, artwork, and synced lyrics, live the moment you hit publish.
          </p>
          <Link href="/apply-artist" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '48px', padding: '14px 24px',
            background: 'var(--gold)', color: 'var(--bg)',
            fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.7rem',
            letterSpacing: '1.5px', textTransform: 'uppercase',
            borderRadius: '50px', textDecoration: 'none',
          }}>
            Apply as an Artist
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '100px 24px var(--margo-page-padding-bottom, 80px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <BackButton fallbackHref="/feed" />
          <div>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Margo
            </p>
            <h1 style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>
              Studio
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-2)' }}>
            {songsLoading ? 'Loading your catalog…' : `${songs.length} song${songs.length !== 1 ? 's' : ''}`}
          </p>
          <button
            onClick={() => setShowUpload(s => !s)}
            style={{
              minHeight: '44px', padding: '0 24px',
              background: 'var(--gold)', color: 'var(--bg)', border: 'none',
              borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, fontSize: '0.7rem', letterSpacing: '1.5px',
              textTransform: 'uppercase', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              transition: 'transform 150ms ease, opacity 150ms ease',
            }}
          >
            {showUpload ? 'Close' : 'Upload a Song'}
          </button>
        </div>

        {showUpload && (
          <div style={{ marginBottom: '24px' }}>
            <SongUploadForm
              artistDisplayName={identity.displayName}
              onComplete={handleUploadComplete}
              onCancel={() => setShowUpload(false)}
            />
          </div>
        )}

        {!songsLoading && songs.length === 0 && !showUpload && (
          <div style={{
            textAlign: 'center', padding: '64px 24px',
            border: '1px solid var(--border)', borderRadius: '16px',
          }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-2)', marginBottom: '4px' }}>
              Nothing here yet.
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-3)' }}>
              Upload your first song to see it here.
            </p>
          </div>
        )}

        {songs.map(song => {
          const stat = stats[song.id]
          return (
            <div key={song.id} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '16px', marginBottom: '10px',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
              opacity: song.status === 'hidden' ? 0.5 : 1,
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '8px', flexShrink: 0,
                background: 'var(--surface-2)', overflow: 'hidden',
              }}>
                {song.artwork_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.artwork_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.title}
                </p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.7rem', color: 'var(--text-3)' }}>
                  {stat ? `${stat.plays} plays · ${stat.resonate_count} resonates` : '—'}
                </p>
              </div>
              <span style={{
                fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '1px',
                color: statusColor(song.status), flexShrink: 0,
              }}>
                {statusLabel(song.status)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
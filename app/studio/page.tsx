'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { SongUploadForm } from '@/components/studio/song-upload-form'
import { useRegisterNavBack } from '@/components/nav-back'
import { MargoSheet } from '@/components/margo-sheet'
import { shareSong } from '@/lib/song-share'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()
const font = UI_FONT

interface StudioSong {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  status: 'draft' | 'processing' | 'live' | 'coming_soon' | 'hidden' | 'archived'
  created_at: string
  deleted_at: string | null
}

interface SongStat {
  song_id: string
  plays: number
  resonate_count: number
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 3v14M3 10h14" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PauseCircleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="var(--text-muted)" strokeWidth="1.5" />
      <rect x="9" y="8" width="2" height="8" rx="1" fill="var(--text-muted)" />
      <rect x="13" y="8" width="2" height="8" rx="1" fill="var(--text-muted)" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6v10m4-10v10M5 9h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <span style={{ fontSize: '1.1rem', lineHeight: 1, color: 'var(--text)', fontWeight: 700 }} aria-hidden>⋯</span>
  )
}

function statusLabel(status: StudioSong['status']): string | null {
  switch (status) {
    case 'processing': return 'Processing'
    case 'coming_soon': return 'Coming Soon'
    case 'hidden': return 'Hidden'
    case 'draft': return 'Draft'
    default: return null
  }
}

const sheetActionBtn: React.CSSProperties = {
  width: '100%',
  minHeight: 'var(--margo-touch-min, 44px)',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontFamily: font,
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  padding: '12px 16px',
}

const sheetDangerBtn: React.CSSProperties = {
  ...sheetActionBtn,
  borderColor: 'rgba(255,96,96,0.35)',
  color: '#ff8a8a',
  background: 'rgba(255,96,96,0.06)',
}

const promoteLinkStyle: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.65rem',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  textDecoration: 'none',
  padding: '10px 14px',
  borderRadius: '999px',
  border: '1px solid var(--gold-border)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
}

const LONG_PRESS_MS = 520

export default function StudioPage() {
  const router = useRouter()
  const { user, identity, loading: identityLoading } = useIdentity()
  const [songs, setSongs] = useState<StudioSong[]>([])
  const [stats, setStats] = useState<Record<string, SongStat>>({})
  const [songsLoading, setSongsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [editingSongId, setEditingSongId] = useState<string | null>(null)

  const [overflowSong, setOverflowSong] = useState<StudioSong | null>(null)
  const [deleteConfirmSong, setDeleteConfirmSong] = useState<StudioSong | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [trashOpen, setTrashOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const userId = user?.id ?? null

  const loadSongs = useCallback(async () => {
    if (!userId) {
      setSongsLoading(false)
      return
    }
    setSongsLoading(true)

    const { data: songRows } = await supabase
      .from('songs')
      .select('id, title, artist_display_name, artwork_url, status, created_at, deleted_at')
      .eq('owner_profile_id', userId)
      .order('created_at', { ascending: false })

    const list = (songRows || []) as StudioSong[]
    setSongs(list)

    const libraryIds = list.filter((s) => s.status !== 'archived').map((s) => s.id)
    if (libraryIds.length > 0) {
      const { data: statRows } = await supabase
        .from('song_stats')
        .select('song_id, plays, resonate_count')
        .in('song_id', libraryIds)

      const statMap: Record<string, SongStat> = {}
      ;(statRows || []).forEach((s: SongStat) => { statMap[s.song_id] = s })
      setStats(statMap)
    } else {
      setStats({})
    }
    setSongsLoading(false)
  }, [userId])

  const isActiveArtist = identity?.isArtist && (identity.artistStatus === 'active' || identity.artistStatus === 'warned' || !identity.artistStatus)

  useEffect(() => {
    if (isActiveArtist) loadSongs()
    else setSongsLoading(false)
  }, [isActiveArtist, loadSongs])

  const librarySongs = useMemo(
    () => songs.filter((s) => s.status !== 'archived'),
    [songs],
  )
  const trashSongs = useMemo(
    () => songs.filter((s) => s.status === 'archived'),
    [songs],
  )

  const selectedCount = selectedIds.size
  const selectableLibraryIds = useMemo(() => librarySongs.map((s) => s.id), [librarySongs])

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const patchSong = useCallback(async (songId: string, action: 'hide' | 'soft_delete' | 'restore') => {
    setActionBusy(true)
    try {
      const res = await fetch(`/api/studio/songs/${encodeURIComponent(songId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Request failed')
      return body
    } finally {
      setActionBusy(false)
    }
  }, [])

  const bulkPost = useCallback(async (ids: string[], action: 'hide' | 'soft_delete') => {
    setActionBusy(true)
    try {
      const res = await fetch('/api/studio/songs/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Request failed')
      return body as { results?: { id: string; ok: boolean; error?: string }[] }
    } finally {
      setActionBusy(false)
    }
  }, [])

  const handleUploadComplete = () => {
    setShowUpload(false)
    setEditingSongId(null)
    loadSongs()
  }

  useRegisterNavBack({
    preferHistory: false,
    fallbackHref: identity?.username ? `/profile/${identity.username}` : '/you',
    onBack: showUpload ? () => {
      setShowUpload(false)
      setEditingSongId(null)
      return true
    } : undefined,
  })

  const totalPlays = Object.values(stats).reduce((sum, s) => sum + (s.plays || 0), 0)
  const totalResonates = Object.values(stats).reduce((sum, s) => sum + (s.resonate_count || 0), 0)

  const onOverflowHideToggle = async (song: StudioSong) => {
    if (actionBusy) return
    try {
      await patchSong(song.id, 'hide')
      toast(song.status === 'hidden' ? 'Song is visible again' : 'Song hidden from feed & search')
      setOverflowSong(null)
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update')
    }
  }

  const onSoftDelete = async (song: StudioSong) => {
    if (actionBusy) return
    const id = song.id
    try {
      await patchSong(id, 'soft_delete')
      toast('Moved to Trash', {
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await patchSong(id, 'restore')
              await loadSongs()
              toast('Restored')
            } catch {
              toast.error('Could not undo')
            }
          },
        },
      })
      setDeleteConfirmSong(null)
      setOverflowSong(null)
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  const onRestore = async (song: StudioSong) => {
    if (actionBusy) return
    try {
      await patchSong(song.id, 'restore')
      toast('Song restored')
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not restore')
    }
  }

  const handleBulkHide = async () => {
    if (selectedIds.size === 0 || actionBusy) return
    try {
      await bulkPost([...selectedIds], 'hide')
      toast('Hidden from feed & search')
      exitSelectMode()
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk action failed')
    }
  }

  const handleBulkSoftDelete = async () => {
    if (selectedIds.size === 0 || actionBusy) return
    const ids = [...selectedIds]
    try {
      await bulkPost(ids, 'soft_delete')
      toast('Moved to Trash', {
        action: {
          label: 'Undo',
          onClick: async () => {
            for (const id of ids) {
              try { await patchSong(id, 'restore') } catch { /* ignore */ }
            }
            await loadSongs()
            toast('Restored')
          },
        },
      })
      setBulkDeleteOpen(false)
      exitSelectMode()
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk delete failed')
    }
  }

  const startSelectFromOverflow = (song: StudioSong) => {
    setOverflowSong(null)
    setSelectMode(true)
    setSelectedIds(new Set([song.id]))
  }

  const onCardPointerDown = (song: StudioSong) => {
    if (selectMode) return
    longPressFired.current = false
    clearLongPressTimer()
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setOverflowSong(song)
    }, LONG_PRESS_MS)
  }

  const onCardPointerUp = () => {
    clearLongPressTimer()
  }

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
              ? 'Your artist standing on Margo has been removed. If you think this is a mistake, reach out to us.'
              : 'Your artist standing is on hold. Your songs are hidden from public view while your account is under review, and new uploads are paused until this is resolved.'}
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

  const bulkBar = selectMode && !showUpload ? (
    <div style={{
      position: 'sticky',
      top: 'calc(var(--nav-height, 72px) + 8px)',
      zIndex: 30,
      marginBottom: '16px',
      padding: '12px 14px',
      borderRadius: '14px',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ fontFamily: font, fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600, marginRight: '4px' }}>
        {selectedCount} selected
      </span>
      <button
        type="button"
        disabled={actionBusy || selectableLibraryIds.length === 0 || selectedCount === selectableLibraryIds.length}
        onClick={() => setSelectedIds(new Set(selectableLibraryIds))}
        style={{
          padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--surface-2)',
          color: 'var(--gold)', fontFamily: font, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        Select all
      </button>
      <button
        type="button"
        disabled={actionBusy || selectedCount === 0}
        onClick={() => { void handleBulkHide() }}
        style={{
          padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--gold-border)', background: 'transparent',
          color: 'var(--gold)', fontFamily: font, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        Hide
      </button>
      <button
        type="button"
        disabled={actionBusy || selectedCount === 0}
        onClick={() => setBulkDeleteOpen(true)}
        style={{
          padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,96,96,0.35)', background: 'transparent',
          color: '#ff8a8a', fontFamily: font, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.5px',
          textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        Delete
      </button>
      <button
        type="button"
        disabled={actionBusy}
        onClick={exitSelectMode}
        style={{
          padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-muted)', fontFamily: font, fontSize: '0.62rem', fontWeight: 600, marginLeft: 'auto',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  ) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)' }}>
        {bulkBar}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Margo
            </p>
            <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>
              {showUpload ? (editingSongId ? 'Edit song' : 'Upload') : 'Studio'}
            </h1>
          </div>
          {!showUpload && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {identity.artistStatus === 'active' && (
                <Link href="/studio/promote" style={promoteLinkStyle}>
                  Promote
                </Link>
              )}
              {trashSongs.length > 0 && (
                <button
                  type="button"
                  aria-label="Trash"
                  title="Trash"
                  onClick={() => setTrashOpen(true)}
                  style={{
                    ...promoteLinkStyle,
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    background: 'var(--surface-2)',
                  }}
                >
                  <TrashIcon />
                  <span>Trash</span>
                  <span style={{
                    fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700,
                  }}>({trashSongs.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!songsLoading && librarySongs.length > 0 && !showUpload && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
            {[
              ['Songs', librarySongs.length],
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
              artistUsername={identity.username}
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

            {librarySongs.map((song) => {
              const stat = stats[song.id]
              const label = statusLabel(song.status)
              const selected = selectedIds.has(song.id)
              return (
                <div key={song.id} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (longPressFired.current) {
                        longPressFired.current = false
                        return
                      }
                      if (selectMode) {
                        toggleSelected(song.id)
                        return
                      }
                      setEditingSongId(song.id)
                      setShowUpload(true)
                    }}
                    onPointerDown={() => onCardPointerDown(song)}
                    onPointerUp={onCardPointerUp}
                    onPointerLeave={onCardPointerUp}
                    onPointerCancel={onCardPointerUp}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setOverflowSong(song)
                    }}
                    aria-label={selectMode ? `Select ${song.title}` : `Edit ${song.title}`}
                    style={{
                      position: 'relative', aspectRatio: '1 / 1', borderRadius: '16px',
                      overflow: 'hidden', background: 'var(--surface-2)',
                      opacity: song.status === 'hidden' ? 0.5 : 1,
                      border: selected ? '2px solid var(--gold)' : 'none', padding: 0, cursor: 'pointer',
                      width: '100%', textAlign: 'left',
                      minHeight: 'var(--margo-touch-min)',
                    }}
                  >
                    {selectMode && (
                      <span style={{
                        position: 'absolute', top: '10px', left: '10px', zIndex: 2,
                        width: '22px', height: '22px', borderRadius: '6px',
                        border: '2px solid var(--gold)',
                        background: selected ? 'var(--gold)' : 'rgba(7,6,10,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', color: 'var(--bg)', fontWeight: 800,
                      }}>
                        {selected ? '✓' : ''}
                      </span>
                    )}
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
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                        lineHeight: 1.25,
                      }}>
                        {song.title}
                      </p>
                      <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {stat ? `${stat.plays} plays · ${stat.resonate_count} resonates` : '—'}
                      </p>
                    </div>
                  </button>
                  {!selectMode && (
                    <button
                      type="button"
                      aria-label={`More actions for ${song.title}`}
                      className="studio-card-more"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        setOverflowSong(song)
                      }}
                      style={{
                        position: 'absolute', top: '8px', left: '8px', zIndex: 3,
                        width: '32px', height: '32px', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(7,6,10,0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
                      }}
                    >
                      <MoreIcon />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!songsLoading && librarySongs.length === 0 && !showUpload && (
          <p style={{
            fontFamily: font, fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-secondary)',
            textAlign: 'center', marginTop: '16px',
          }}>
            No songs yet — upload your first.
          </p>
        )}
      </div>

      <MargoSheet open={!!overflowSong} onOpenChange={(o) => { if (!o) setOverflowSong(null) }} title="Song actions" anchor="bottom" zIndex={220}>
        {overflowSong && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>{overflowSong.title}</p>
            <button type="button" style={sheetActionBtn} onClick={() => startSelectFromOverflow(overflowSong)}>
              Select
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy || overflowSong.status === 'archived'}
              onClick={() => { void onOverflowHideToggle(overflowSong) }}
            >
              {overflowSong.status === 'hidden' ? 'Unhide' : 'Hide from feed'}
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy}
              onClick={async () => {
                const s = overflowSong
                setOverflowSong(null)
                const r = await shareSong({ id: s.id, title: s.title, artist: s.artist_display_name })
                if (r === 'shared') toast('Shared')
                else if (r === 'copied') toast('Link copied')
                else toast('Could not share')
              }}
            >
              Share
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy}
              onClick={() => {
                router.push(`/song/${overflowSong.id}`)
                setOverflowSong(null)
              }}
            >
              Stats
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy || identity.artistStatus !== 'active'}
              onClick={() => {
                setOverflowSong(null)
                router.push('/studio/promote')
              }}
            >
              Promote
            </button>
            <button
              type="button"
              style={sheetDangerBtn}
              disabled={actionBusy || overflowSong.status === 'archived'}
              onClick={() => { setDeleteConfirmSong(overflowSong); setOverflowSong(null) }}
            >
              Delete…
            </button>
          </div>
        )}
      </MargoSheet>

      <MargoSheet open={!!deleteConfirmSong} onOpenChange={(o) => { if (!o) setDeleteConfirmSong(null) }} title="Move to Trash?" anchor="bottom" zIndex={230}>
        {deleteConfirmSong && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>{deleteConfirmSong.title}</strong>
              {' '}will leave feeds, Discover, search, and Hub. Restore within 30 days from Trash.
            </p>
            <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {(() => {
                const st = stats[deleteConfirmSong.id]
                return `${st?.plays ?? 0} plays · ${st?.resonate_count ?? 0} resonates`
              })()}
            </p>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy}
              onClick={async () => {
                const s = deleteConfirmSong
                try {
                  await patchSong(s.id, 'hide')
                  toast(s.status === 'hidden' ? 'Song is visible again' : 'Song hidden from feed & search')
                  setDeleteConfirmSong(null)
                  await loadSongs()
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Could not update')
                }
              }}
            >
              Hide instead
            </button>
            <button type="button" style={sheetDangerBtn} disabled={actionBusy} onClick={() => { void onSoftDelete(deleteConfirmSong) }}>
              Move to Trash
            </button>
            <button type="button" style={{ ...sheetActionBtn, border: 'none', background: 'transparent', color: 'var(--text-muted)' }} onClick={() => setDeleteConfirmSong(null)}>
              Cancel
            </button>
          </div>
        )}
      </MargoSheet>

      <MargoSheet open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen} title="Move to Trash?" anchor="bottom" zIndex={230}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {selectedCount} song{selectedCount === 1 ? '' : 's'} will move to Trash. Undo from the toast or restore in Trash.
          </p>
          <button type="button" style={sheetDangerBtn} disabled={actionBusy} onClick={() => { void handleBulkSoftDelete() }}>
            Move to Trash
          </button>
          <button type="button" style={{ ...sheetActionBtn, border: 'none', background: 'transparent', color: 'var(--text-muted)' }} onClick={() => setBulkDeleteOpen(false)}>
            Cancel
          </button>
        </div>
      </MargoSheet>

      <MargoSheet open={trashOpen} onOpenChange={setTrashOpen} title="Trash" anchor="bottom" zIndex={220} heightMode="fixed" maxHeight="min(70dvh, 520px)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
            Songs stay here for 30 days, then they are removed permanently.
          </p>
          {trashSongs.length === 0 ? (
            <p style={{ fontFamily: font, fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Trash is empty.</p>
          ) : (
            trashSongs.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => { void onRestore(song) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px',
                  border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                {song.artwork_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={song.artwork_url} alt="" width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--surface)', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontFamily: font, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{song.title}</p>
                  <p style={{ fontFamily: font, fontSize: '0.65rem', color: 'var(--gold)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tap to restore</p>
                </div>
              </button>
            ))
          )}
        </div>
      </MargoSheet>

      <style>{`
        @media (max-width: 520px) {
          .studio-card-more { display: none; }
        }
      `}</style>
    </div>
  )
}

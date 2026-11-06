'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

function statusLabel(status: StudioSong['status'], inTrash: boolean): string | null {
  if (inTrash && status === 'archived') return 'Trash'
  switch (status) {
    case 'processing': return 'Processing'
    case 'coming_soon': return 'Coming Soon'
    case 'hidden': return 'Hidden'
    case 'draft': return 'Draft'
    case 'archived': return 'Trash'
    default: return null
  }
}

const pillBtn: React.CSSProperties = {
  fontFamily: font,
  fontSize: '0.62rem',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  padding: '10px 14px',
  borderRadius: '999px',
  border: '1px solid var(--gold-border)',
  background: 'transparent',
  color: 'var(--gold)',
  cursor: 'pointer',
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

export default function StudioPage() {
  const router = useRouter()
  const { user, identity, loading: identityLoading } = useIdentity()
  const [songs, setSongs] = useState<StudioSong[]>([])
  const [stats, setStats] = useState<Record<string, SongStat>>({})
  const [songsLoading, setSongsLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [editingSongId, setEditingSongId] = useState<string | null>(null)

  const [sheetSong, setSheetSong] = useState<StudioSong | null>(null)
  const [deleteConfirmSong, setDeleteConfirmSong] = useState<StudioSong | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [trashView, setTrashView] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

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

    const visibleIds = list.filter((s) => s.status !== 'archived').map((s) => s.id)
    if (visibleIds.length > 0) {
      const { data: statRows } = await supabase
        .from('song_stats')
        .select('song_id, plays, resonate_count')
        .in('song_id', visibleIds)

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

  const displayedSongs = trashView ? trashSongs : librarySongs

  const totalPlays = useMemo(() => Object.values(stats).reduce((sum, s) => sum + (s.plays || 0), 0), [stats])
  const totalResonates = useMemo(() => Object.values(stats).reduce((sum, s) => sum + (s.resonate_count || 0), 0), [stats])

  const selectedCount = selectedIds.size

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
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

  const onSheetHideToggle = async () => {
    if (!sheetSong || actionBusy) return
    try {
      await patchSong(sheetSong.id, 'hide')
      toast(sheetSong.status === 'hidden' ? 'Song is visible again' : 'Song hidden from feed & search')
      setSheetSong(null)
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update')
    }
  }

  const onSheetSoftDelete = async () => {
    const target = deleteConfirmSong ?? sheetSong
    if (!target || actionBusy) return
    const id = target.id
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
      setSheetSong(null)
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  const onHideInsteadFromConfirm = async () => {
    const target = deleteConfirmSong
    if (!target || actionBusy) return
    try {
      await patchSong(target.id, 'hide')
      toast(target.status === 'hidden' ? 'Song is visible again' : 'Song hidden from feed & search')
      setDeleteConfirmSong(null)
      setSheetSong(null)
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update')
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
      toast('Updated visibility')
      clearSelection()
      setSelectMode(false)
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk action failed')
    }
  }

  const handleBulkSoftDelete = async () => {
    if (selectedIds.size === 0 || actionBusy) return
    try {
      await bulkPost([...selectedIds], 'soft_delete')
      toast('Moved to Trash', {
        action: {
          label: 'Undo',
          onClick: async () => {
            for (const id of selectedIds) {
              try { await patchSong(id, 'restore') } catch { /* one failure */ }
            }
            await loadSongs()
            toast('Restored')
          },
        },
      })
      setBulkDeleteOpen(false)
      clearSelection()
      setSelectMode(false)
      await loadSongs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk delete failed')
    }
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <p style={{ fontFamily: font, fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Margo
            </p>
            <h1 style={{ fontFamily: font, fontSize: '1.5rem', color: 'var(--text)', fontWeight: 400 }}>
              {showUpload ? (editingSongId ? 'Edit song' : 'Upload') : trashView ? 'Trash' : 'Studio'}
            </h1>
          </div>
          {!showUpload && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setTrashView((v) => !v)
                  setSelectMode(false)
                  clearSelection()
                }}
                style={pillBtn}
              >
                {trashView ? 'Library' : 'Trash'}
              </button>
              {!trashView && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectMode((s) => {
                      if (s) clearSelection()
                      return !s
                    })
                  }}
                  style={pillBtn}
                >
                  {selectMode ? 'Done' : 'Select'}
                </button>
              )}
              {identity.artistStatus === 'active' && !trashView && (
                <Link
                  href="/studio/promote"
                  style={{ ...pillBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Promote
                </Link>
              )}
            </div>
          )}
        </div>

        {selectMode && !trashView && !showUpload && selectedCount > 0 && (
          <div style={{
            display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
            padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)',
          }}>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => { void handleBulkHide() }}
              style={{ ...pillBtn, opacity: actionBusy ? 0.6 : 1 }}
            >
              Hide ({selectedCount})
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => setBulkDeleteOpen(true)}
              style={{
                ...pillBtn,
                borderColor: 'rgba(255,96,96,0.35)',
                color: '#ff8a8a',
                opacity: actionBusy ? 0.6 : 1,
              }}
            >
              Delete ({selectedCount})
            </button>
          </div>
        )}

        {!songsLoading && librarySongs.length > 0 && !showUpload && !trashView && (
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
            {!trashView && (
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
            )}

            {songsLoading && (
              <div style={{
                aspectRatio: '1 / 1', borderRadius: '16px', background: 'var(--surface-2)',
              }} />
            )}

            {displayedSongs.map((song) => {
              const stat = stats[song.id]
              const label = statusLabel(song.status, trashView)
              const selected = selectedIds.has(song.id)
              const dim = song.status === 'hidden' || song.status === 'archived'
              return (
                <button
                  type="button"
                  key={song.id}
                  onClick={() => {
                    if (selectMode && !trashView) {
                      toggleSelected(song.id)
                      return
                    }
                    if (trashView) {
                      void onRestore(song)
                      return
                    }
                    setSheetSong(song)
                  }}
                  aria-label={trashView ? `Restore ${song.title}` : selectMode ? `Select ${song.title}` : `Open actions for ${song.title}`}
                  style={{
                    position: 'relative', aspectRatio: '1 / 1', borderRadius: '16px',
                    overflow: 'hidden', background: 'var(--surface-2)',
                    opacity: dim ? 0.55 : 1,
                    border: selected ? '2px solid var(--gold)' : 'none', padding: 0, cursor: 'pointer',
                    width: '100%', textAlign: 'left',
                    minHeight: 'var(--margo-touch-min)',
                  }}
                >
                  {selectMode && !trashView && (
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
                      {trashView
                        ? 'Tap to restore'
                        : (stat ? `${stat.plays} plays · ${stat.resonate_count} resonates` : '—')}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {!songsLoading && displayedSongs.length === 0 && !showUpload && (
          <p style={{
            fontFamily: font, fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-secondary)',
            textAlign: 'center', marginTop: '16px',
          }}>
            {trashView ? 'Trash is empty.' : 'No songs yet — upload your first.'}
          </p>
        )}
      </div>

      <MargoSheet
        open={!!sheetSong && !deleteConfirmSong}
        onOpenChange={(o) => { if (!o) setSheetSong(null) }}
        title="Song"
        anchor="bottom"
        zIndex={220}
      >
        {sheetSong && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text)', margin: '0 0 4px', fontWeight: 600 }}>
              {sheetSong.title}
            </p>
            <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
              {sheetSong.artist_display_name}
            </p>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={sheetSong.status === 'archived' || actionBusy}
              onClick={() => {
                if (sheetSong.status === 'archived') {
                  toast.error('Restore from Trash to edit.')
                  return
                }
                setEditingSongId(sheetSong.id)
                setShowUpload(true)
                setSheetSong(null)
              }}
            >
              Edit
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy || sheetSong.status === 'archived'}
              onClick={() => { void onSheetHideToggle() }}
            >
              {sheetSong.status === 'hidden' ? 'Unhide' : 'Hide from feed'}
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy || identity.artistStatus !== 'active'}
              onClick={() => {
                setSheetSong(null)
                router.push('/studio/promote')
              }}
            >
              Promote
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy}
              onClick={async () => {
                if (!sheetSong) return
                const r = await shareSong({
                  id: sheetSong.id,
                  title: sheetSong.title,
                  artist: sheetSong.artist_display_name,
                })
                if (r === 'shared') toast('Shared')
                else if (r === 'copied') toast('Link copied')
                else toast('Could not share')
                setSheetSong(null)
              }}
            >
              Share
            </button>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy}
              onClick={() => {
                if (!sheetSong) return
                router.push(`/song/${sheetSong.id}`)
                setSheetSong(null)
              }}
            >
              Stats
            </button>
            <button
              type="button"
              style={sheetDangerBtn}
              disabled={actionBusy || sheetSong.status === 'archived'}
              onClick={() => setDeleteConfirmSong(sheetSong)}
            >
              Delete…
            </button>
          </div>
        )}
      </MargoSheet>

      <MargoSheet
        open={!!deleteConfirmSong}
        onOpenChange={(o) => { if (!o) setDeleteConfirmSong(null) }}
        title="Move to Trash?"
        anchor="bottom"
        zIndex={230}
      >
        {deleteConfirmSong && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>{deleteConfirmSong.title}</strong>
              {' '}will leave feeds, Discover, search, and Hub. You can restore for 30 days from Trash.
            </p>
            <p style={{ fontFamily: font, fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {(() => {
                const st = stats[deleteConfirmSong.id]
                const p = st?.plays ?? 0
                const r = st?.resonate_count ?? 0
                return `${p} plays · ${r} resonates`
              })()}
            </p>
            <button
              type="button"
              style={sheetActionBtn}
              disabled={actionBusy}
              onClick={() => { void onHideInsteadFromConfirm() }}
            >
              Hide instead
            </button>
            <button
              type="button"
              style={sheetDangerBtn}
              disabled={actionBusy}
              onClick={() => { void onSheetSoftDelete() }}
            >
              Move to Trash
            </button>
            <button
              type="button"
              style={{ ...sheetActionBtn, border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
              onClick={() => setDeleteConfirmSong(null)}
            >
              Cancel
            </button>
          </div>
        )}
      </MargoSheet>

      <MargoSheet
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Move to Trash?"
        anchor="bottom"
        zIndex={230}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontFamily: font, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {selectedCount} song{selectedCount === 1 ? '' : 's'} will move to Trash. Restore within 30 days if you change your mind.
          </p>
          <button
            type="button"
            style={sheetDangerBtn}
            disabled={actionBusy}
            onClick={() => { void handleBulkSoftDelete() }}
          >
            Move to Trash
          </button>
          <button
            type="button"
            style={{ ...sheetActionBtn, border: 'none', background: 'transparent', color: 'var(--text-muted)' }}
            onClick={() => setBulkDeleteOpen(false)}
          >
            Cancel
          </button>
        </div>
      </MargoSheet>
    </div>
  )
}

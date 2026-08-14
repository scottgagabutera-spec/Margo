'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BackButton } from '@/components/back-button'
import { PlaylistLyricRow } from '@/components/playlist-lyric-row'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import {
  fetchPlaylistDetail,
  playPlaylistSession,
  type LibraryPlaylistDetail,
  type LibraryPlaylistItem,
} from '@/lib/library/playlists'
import {
  fullSongToQueueItem,
  queueAdd,
  queuePlayNext,
  snippetToQueueItem,
} from '@/lib/audio-engine'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'

function isPlayable(item: LibraryPlaylistItem): boolean {
  return !!item.audioUrl && (item.status === 'live' || item.status === 'active' || !item.status)
}

function queueItemFromRow(item: LibraryPlaylistItem) {
  if (!item.audioUrl) return null
  if (item.isSnippet) {
    return snippetToQueueItem({
      songId: item.songId,
      audioUrl: item.audioUrl,
      title: item.title,
      artist: item.artist,
      artwork: item.artwork,
      lineIndex: item.lineIndex,
      lineText: item.lineText || '',
      startSec: item.startSec,
      endSec: item.endSec,
      vibe: null,
    })
  }
  return fullSongToQueueItem({
    id: item.songId,
    audioUrl: item.audioUrl,
    title: item.title,
    artist: item.artist,
    artwork: item.artwork,
  })
}

export default function LibraryPlaylistPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { user, loading: identityLoading } = useIdentity()
  const { requireAuth } = useAuthGate()
  const [detail, setDetail] = useState<LibraryPlaylistDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    void fetchPlaylistDetail(id).then((row) => {
      if (cancelled) return
      setDetail(row)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  const isOwner = !!user && !user.isAnonymous && detail?.ownerId === user.id

  const queueSlots = useMemo(() => {
    const slots: number[] = []
    let k = 0
    for (const item of detail?.items || []) {
      if (isPlayable(item)) {
        slots.push(k)
        k += 1
      } else {
        slots.push(-1)
      }
    }
    return slots
  }, [detail])

  const playFrom = (itemIndex: number) => {
    if (!requireAuth() || !detail) return
    playPlaylistSession(detail.items, itemIndex)
  }

  const addRow = (item: LibraryPlaylistItem, mode: 'next' | 'add') => {
    if (!requireAuth()) return
    const q = queueItemFromRow(item)
    if (!q) return
    if (mode === 'next') queuePlayNext(q)
    else queueAdd(q)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 24px) 20px var(--margo-page-padding-bottom)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <BackButton fallbackHref="/library" />
        </div>

        {identityLoading || loading ? (
          <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Loading…</p>
        ) : !user || user.isAnonymous ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{
              fontFamily: LYRIC_FONT,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}>
              Sign in to open your library
            </p>
            <Link href="/signin" style={{
              padding: '10px 24px',
              border: '1px solid var(--border)',
              borderRadius: '50px',
              color: 'var(--text-secondary)',
              fontFamily: UI_FONT,
              fontSize: '0.6rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}>
              Sign In
            </Link>
          </div>
        ) : !detail || !isOwner ? (
          <div>
            <p style={{
              fontFamily: LYRIC_FONT,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              marginBottom: '16px',
            }}>
              Not found or not yours.
            </p>
            <Link href="/library" style={{
              fontFamily: UI_FONT,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              textDecoration: 'none',
            }}>
              Back to Library
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{
                  fontFamily: LYRIC_FONT,
                  fontStyle: 'italic',
                  fontSize: '1.4rem',
                  color: 'var(--text)',
                  margin: 0,
                }}>
                  {detail.title}
                </h1>
                {detail.type === 'lyric' && (
                  <p style={{
                    fontFamily: UI_FONT,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    margin: '8px 0 0',
                  }}>
                    Lyric mix
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={detail.items.every(i => !isPlayable(i))}
                onClick={() => playFrom(0)}
                style={{
                  padding: '8px 14px',
                  minHeight: 'var(--margo-touch-min)',
                  borderRadius: '50px',
                  border: '1px solid var(--gold-border)',
                  background: 'var(--gold-faint)',
                  color: 'var(--gold)',
                  fontFamily: UI_FONT,
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Play all
              </button>
            </div>
            <p style={{
              fontFamily: UI_FONT,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              margin: '0 0 20px',
            }}>
              {detail.items.length} {detail.items.length === 1 ? 'item' : 'items'}
            </p>
            {detail.items.length === 0 ? (
              <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                This mix is empty.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.items.map((item, i) => (
                  <PlaylistLyricRow
                    key={`${item.position}-${item.songId}-${item.lineIndex}`}
                    item={item}
                    queueSlot={queueSlots[i] ?? -1}
                    onPlay={() => playFrom(i)}
                    onPlayNext={() => addRow(item, 'next')}
                    onAddQueue={() => addRow(item, 'add')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

'use client'

import Link from 'next/link'
import { useIdentity } from '@/hooks/useIdentity'
import { useLibraryShelves } from '@/hooks/useLibraryShelves'
import { BackButton } from '@/components/back-button'
import { SongCatalogCard, type SongCardData } from '@/components/song-catalog-card'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { playSongsAsSession } from '@/lib/library/play-songs-session'
import {
  fetchPlaylistDetail,
  playPlaylistSession,
  type LibraryPlaylistSummary,
} from '@/lib/library/playlists'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'

function PlayAllButton({
  disabled,
  onClick,
  label = 'Play all',
}: {
  disabled: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
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
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  )
}

function EmptyCopy({ children, href, linkLabel }: { children: string; href: string; linkLabel: string }) {
  return (
    <div style={{ padding: '8px 0 4px' }}>
      <p style={{
        fontFamily: UI_FONT,
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        lineHeight: 1.5,
        margin: '0 0 10px',
      }}>
        {children}
      </p>
      <Link href={href} style={{
        fontFamily: UI_FONT,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        color: 'var(--gold)',
        textDecoration: 'none',
      }}>
        {linkLabel}
      </Link>
    </div>
  )
}

function SongGrid({ songs }: { songs: SongCardData[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: '16px',
    }}>
      {songs.map(song => (
        <SongCatalogCard key={song.id} song={song} />
      ))}
    </div>
  )
}

function PlaylistIndexRow({
  playlist,
  onPlay,
}: {
  playlist: LibraryPlaylistSummary
  onPlay: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <Link
        href={`/library/playlists/${playlist.id}`}
        style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
      >
        <p style={{
          fontFamily: UI_FONT,
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--text)',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {playlist.title}
        </p>
        <p style={{
          fontFamily: UI_FONT,
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          margin: '4px 0 0',
        }}>
          {playlist.itemCount} {playlist.itemCount === 1 ? 'item' : 'items'}
          {playlist.type === 'lyric' ? ' · Lyric mix' : ''}
        </p>
      </Link>
      <PlayAllButton disabled={playlist.itemCount < 1} onClick={onPlay} label="Play" />
    </div>
  )
}

export default function LibraryPage() {
  const { user, loading: identityLoading } = useIdentity()
  const { requireAuth } = useAuthGate()
  const isSignedIn = !!user && !user.isAnonymous
  const { liked, listenLater, playlists, loading } = useLibraryShelves(
    isSignedIn ? user.id : null,
  )

  const playShelf = (songs: SongCardData[]) => {
    if (!requireAuth()) return
    playSongsAsSession(songs, 0)
  }

  const playPlaylist = async (id: string) => {
    if (!requireAuth()) return
    const detail = await fetchPlaylistDetail(id)
    if (!detail) return
    playPlaylistSession(detail.items, 0)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '72rem',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 24px) 20px var(--margo-page-padding-bottom)',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <BackButton fallbackHref="/discover" />
        </div>

        <h1 style={{
          fontFamily: LYRIC_FONT,
          fontStyle: 'italic',
          fontSize: '1.5rem',
          color: 'var(--text)',
          margin: '0 0 8px',
        }}>
          Library
        </h1>
        <p style={{
          fontFamily: UI_FONT,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          margin: '0 0 28px',
          lineHeight: 1.5,
        }}>
          Your saves
        </p>

        {identityLoading ? (
          <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Loading…</p>
        ) : !isSignedIn ? (
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
        ) : loading ? (
          <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                <h2 style={{ fontFamily: UI_FONT, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Listen Later · {listenLater.length}
                </h2>
                <PlayAllButton
                  disabled={listenLater.length === 0}
                  onClick={() => playShelf(listenLater)}
                />
              </div>
              {listenLater.length === 0 ? (
                <EmptyCopy href="/discover/songs" linkLabel="Browse songs">
                  Songs you save for later show up here. On a song card, open ⋯ and tap Listen Later.
                </EmptyCopy>
              ) : (
                <SongGrid songs={listenLater} />
              )}
            </section>

            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                <h2 style={{ fontFamily: UI_FONT, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Liked · {liked.length}
                </h2>
                <PlayAllButton
                  disabled={liked.length === 0}
                  onClick={() => playShelf(liked)}
                />
              </div>
              {liked.length === 0 ? (
                <EmptyCopy href="/discover/songs" linkLabel="Browse songs">
                  Songs you like from Discover live here. Tap the heart on a song card.
                </EmptyCopy>
              ) : (
                <SongGrid songs={liked} />
              )}
            </section>

            <section>
              <div style={{ marginBottom: '14px' }}>
                <h2 style={{ fontFamily: UI_FONT, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Playlists · {playlists.length}
                </h2>
              </div>
              {playlists.length === 0 ? (
                <EmptyCopy href="/discover" linkLabel="Discover">
                  Saved mixes land here. Play a Lyric Moment mix, then Save Queue.
                </EmptyCopy>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {playlists.map(pl => (
                    <PlaylistIndexRow
                      key={pl.id}
                      playlist={pl}
                      onPlay={() => { void playPlaylist(pl.id) }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

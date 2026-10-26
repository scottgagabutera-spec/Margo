'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MargoSearchInput } from '@/components/margo-search-input'
import { CardOverflowMenu } from '@/components/card-overflow-menu'
import { useIdentity } from '@/hooks/useIdentity'
import { useLibraryShelves } from '@/hooks/useLibraryShelves'
import type { SongCardData } from '@/components/song-catalog-card'
import { playSongsAsSession } from '@/lib/library/play-songs-session'
import { LIBRARY_SEARCH_HINTS } from '@/lib/depth-search-hints'
import { LIST_ROW_TYPE, LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import { SignInLink } from '@/components/signin-link'
import { signedOutGateBenefitStyle, signedOutGateSignInStyle } from '@/lib/signed-out-gate-styles'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { PlayPauseIcon } from '@/components/play-pause-icon'

type Chip = 'listenLater' | 'liked' | 'playlists'
type SortKey = 'recent' | 'title' | 'artist'

function sortSongs(songs: SongCardData[], sort: SortKey): SongCardData[] {
  const list = [...songs]
  if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
  else if (sort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist))
  return list
}

function LibraryRow({
  song,
  active,
  onPlay,
  onOpen,
}: {
  song: SongCardData
  active: boolean
  onPlay: () => void
  onOpen: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 4px',
      borderRadius: '12px',
      background: active ? 'var(--gold-faint)' : 'transparent',
    }}>
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          border: 'none',
          padding: 0,
          overflow: 'hidden',
          flexShrink: 0,
          cursor: 'pointer',
          background: 'var(--surface-2)',
        }}
      >
        {song.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </button>
      <button
        type="button"
        onClick={onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.name, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
          {song.title}
        </p>
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', margin: '2px 0 0' }}>
          {song.artist}
        </p>
      </button>
      <button
        type="button"
        aria-label={`Play ${song.title}`}
        onClick={onPlay}
        style={{
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--gold)',
        }}
      >
        <PlayPauseIcon playing={active} size={20} color="currentColor" />
      </button>
      <CardOverflowMenu
        items={[
          { id: 'open', label: 'Open song', onSelect: () => { window.location.href = `/song/${song.id}` } },
        ]}
      />
    </div>
  )
}

export function LibraryPageBody({ desktopLyricPane = false }: { desktopLyricPane?: boolean }) {
  const { user, loading: identityLoading } = useIdentity()
  const isSignedIn = !!user && !user.isAnonymous
  const { liked, listenLater, playlists, loading } = useLibraryShelves(isSignedIn ? user.id : null)
  const [chip, setChip] = useState<Chip>('listenLater')
  const [sort, setSort] = useState<SortKey>('recent')
  const [query, setQuery] = useState('')
  const [nowPlaying, setNowPlaying] = useState<SongCardData | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const engine = useAudioEngine()

  const shelf = chip === 'liked' ? liked : listenLater
  const filtered = useMemo(() => {
    let list = sortSongs(shelf, sort)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q),
      )
    }
    return list
  }, [shelf, sort, query])

  const playSong = (song: SongCardData, index: number) => {
    setNowPlaying(song)
    playSongsAsSession(filtered.length ? filtered : [song], index)
    if (!desktopLyricPane) setPlayerOpen(true)
  }

  if (identityLoading) {
    return <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Loading…</p>
  }
  if (!isSignedIn) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <p style={signedOutGateBenefitStyle}>Save lines and songs to find them again.</p>
        <SignInLink style={signedOutGateSignInStyle} returnTo="/library">
          Sign in
        </SignInLink>
      </div>
    )
  }

  const lyricLine = nowPlaying?.title ? `Sing along to ${nowPlaying.title}` : ''

  return (
    <>
      <MargoSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search your library"
        rotatingHints={LIBRARY_SEARCH_HINTS}
        icon="left"
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '14px 0' }}>
        {([
          ['listenLater', `Listen later ${listenLater.length}`],
          ['liked', `Liked ${liked.length}`],
          ['playlists', `Playlists ${playlists.length}`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setChip(id)}
            style={{
              padding: '8px 14px',
              borderRadius: '50px',
              border: '1px solid var(--border)',
              background: chip === id ? 'var(--gold)' : 'var(--surface-2)',
              color: chip === id ? 'var(--bg)' : 'var(--text-secondary)',
              fontFamily: UI_FONT,
              fontSize: LIST_ROW_TYPE.chip,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {chip === 'playlists' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {playlists.map((pl) => (
            <Link
              key={pl.id}
              href={`/library/playlists/${pl.id}`}
              style={{
                fontFamily: UI_FONT,
                fontSize: LIST_ROW_TYPE.name,
                color: 'var(--text)',
                textDecoration: 'none',
                padding: '10px 0',
              }}
            >
              {pl.title}
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              style={{
                fontFamily: UI_FONT,
                fontSize: LIST_ROW_TYPE.chip,
                background: 'var(--surface-2)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 10px',
              }}
            >
              <option value="recent">Recently added</option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
            </select>
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={() => playSongsAsSession(filtered, 0)}
              style={{
                padding: '8px 14px',
                borderRadius: '50px',
                border: '1px solid var(--gold-border)',
                background: 'var(--gold-faint)',
                color: 'var(--gold)',
                fontFamily: UI_FONT,
                fontSize: LIST_ROW_TYPE.chip,
                fontWeight: 700,
                cursor: filtered.length ? 'pointer' : 'default',
                opacity: filtered.length ? 1 : 0.4,
              }}
            >
              Play all
            </button>
          </div>
          {loading ? (
            <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Nothing here yet.</p>
          ) : (
            filtered.map((song, index) => (
              <LibraryRow
                key={song.id}
                song={song}
                active={nowPlaying?.id === song.id && engine.mode !== 'idle'}
                onPlay={() => playSong(song, index)}
                onOpen={() => {
                  setNowPlaying(song)
                  if (!desktopLyricPane) setPlayerOpen(true)
                  else playSong(song, index)
                }}
              />
            ))
          )}
        </>
      )}

      {desktopLyricPane && nowPlaying ? (
        <p style={{
          fontFamily: LYRIC_FONT,
          fontStyle: 'italic',
          fontSize: '1.25rem',
          color: 'var(--gold)',
          marginTop: '24px',
        }}>
          {lyricLine}
        </p>
      ) : null}

      {playerOpen && nowPlaying && !desktopLyricPane ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          background: 'var(--bg)',
          padding: 'calc(var(--nav-height, 72px) + 8px) 20px var(--margo-page-padding-bottom)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={() => setPlayerOpen(false)} aria-label="Close player" style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '1.2rem', cursor: 'pointer' }}>
              ↓
            </button>
            <span style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)' }}>Now playing</span>
            <span style={{ width: 44 }} />
          </div>
          <div style={{
            width: 'min(280px, 80vw)',
            aspectRatio: '1',
            borderRadius: '16px',
            background: 'var(--surface-2)',
            margin: '24px 0',
            overflow: 'hidden',
          }}>
            {nowPlaying.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nowPlaying.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>
          <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.name, fontWeight: 600, margin: '0 0 4px' }}>{nowPlaying.title}</p>
          <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', margin: 0 }}>{nowPlaying.artist}</p>
          <p style={{ fontFamily: LYRIC_FONT, fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--gold)', marginTop: '24px', textAlign: 'center' }}>
            {lyricLine}
          </p>
          <Link href={`/song/${nowPlaying.id}`} style={{ marginTop: '24px', color: 'var(--gold)', fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.chip }}>
            Open full song
          </Link>
        </div>
      ) : null}
    </>
  )
}

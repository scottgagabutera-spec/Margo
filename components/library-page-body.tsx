'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { useAudioEngine, useQueueNavigation } from '@/hooks/useAudioEngine'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { useSong } from '@/hooks/useSong'
import { useSongLibrarySaves } from '@/hooks/useSongLibrarySaves'
import { queueNext, queuePrev, togglePlayPause } from '@/lib/audio-engine'

type Chip = 'listenLater' | 'liked' | 'playlists'
type SortKey = 'recent' | 'title' | 'artist'
type LayoutMode = 'mobile' | 'desktop-split'

function sortSongs(songs: SongCardData[], sort: SortKey): SongCardData[] {
  const list = [...songs]
  if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
  else if (sort === 'artist') list.sort((a, b) => a.artist.localeCompare(b.artist))
  return list
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function LibraryLyricLines({
  songId,
  currentTime,
  maxLines = 3,
  large = false,
}: {
  songId: string | null
  currentTime: number
  maxLines?: number
  large?: boolean
}) {
  const { song, loading } = useSong(songId)
  const lines = song?.lyricLines ?? []

  const activeIdx = useMemo(() => {
    if (lines.length === 0) return 0
    const idx = lines.findIndex(
      (l) => currentTime >= l.startSec && currentTime < l.endSec,
    )
    return idx >= 0 ? idx : 0
  }, [lines, currentTime])

  const windowLines = useMemo(() => {
    if (lines.length === 0) return []
    if (maxLines >= lines.length) return lines
    const half = Math.floor(maxLines / 2)
    let start = Math.max(0, activeIdx - half)
    if (start + maxLines > lines.length) start = Math.max(0, lines.length - maxLines)
    return lines.slice(start, start + maxLines)
  }, [lines, activeIdx, maxLines])

  if (!songId) {
    return (
      <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', margin: 0 }}>
        Lyrics show here while a song plays
      </p>
    )
  }
  if (loading) {
    return <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Loading lyrics…</p>
  }
  if (windowLines.length === 0) {
    return (
      <p style={{ fontFamily: LYRIC_FONT, fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0 }}>
        No lyric lines yet for this song.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: large ? '14px' : '10px' }}>
      {(large ? lines : windowLines).map((line) => {
        const isActive = line.lineIndex === lines[activeIdx]?.lineIndex
        return (
          <p
            key={line.lineIndex}
            style={{
              fontFamily: LYRIC_FONT,
              fontStyle: 'italic',
              fontSize: large ? '1.35rem' : '1.05rem',
              lineHeight: 1.45,
              margin: 0,
              color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
              textAlign: large ? 'center' : 'left',
            }}
          >
            {line.text}
          </p>
        )
      })}
    </div>
  )
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

function LibraryShelfControls({
  chip,
  setChip,
  listenLater,
  liked,
  playlists,
  sort,
  setSort,
  filtered,
}: {
  chip: Chip
  setChip: (c: Chip) => void
  listenLater: SongCardData[]
  liked: SongCardData[]
  playlists: { id: string; title: string }[]
  sort: SortKey
  setSort: (s: SortKey) => void
  filtered: SongCardData[]
}) {
  return (
    <>
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
      {chip !== 'playlists' ? (
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
      ) : null}
    </>
  )
}

export function LibraryPageBody({ layoutMode = 'mobile' }: { layoutMode?: LayoutMode }) {
  const desktopSplit = layoutMode === 'desktop-split'
  const { user, loading: identityLoading } = useIdentity()
  const isSignedIn = !!user && !user.isAnonymous
  const { liked, listenLater, playlists, loading } = useLibraryShelves(isSignedIn ? user.id : null)
  const [chip, setChip] = useState<Chip>('listenLater')
  const [sort, setSort] = useState<SortKey>('recent')
  const [query, setQuery] = useState('')
  const [nowPlaying, setNowPlaying] = useState<SongCardData | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const engine = useAudioEngine()
  const { canPrev, canNext } = useQueueNavigation()
  const { isLiked, isListenLater, toggleLike, toggleListenLater } = useSongLibrarySaves()

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

  const activeSongId =
    engine.mode !== 'idle' && engine.songId
      ? engine.songId
      : nowPlaying?.id ?? null

  const activeSongMeta = useMemo(() => {
    if (engine.mode !== 'idle' && engine.songId) {
      return {
        id: engine.songId,
        title: engine.title,
        artist: engine.artist,
        artwork: engine.artwork,
      }
    }
    return nowPlaying
  }, [engine.mode, engine.songId, engine.title, engine.artist, engine.artwork, nowPlaying])

  const playSong = (song: SongCardData, index: number) => {
    setNowPlaying(song)
    playSongsAsSession(filtered.length ? filtered : [song], index)
    if (!desktopSplit) setPlayerOpen(true)
  }

  useEffect(() => {
    if (!playerOpen || desktopSplit) return
    document.documentElement.setAttribute('data-margo-library-player', '1')
    return () => document.documentElement.removeAttribute('data-margo-library-player')
  }, [playerOpen, desktopSplit])

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

  const listSection = (
    <>
      <MargoSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search your library"
        rotatingHints={LIBRARY_SEARCH_HINTS}
        icon="left"
      />
      <LibraryShelfControls
        chip={chip}
        setChip={setChip}
        listenLater={listenLater}
        liked={liked}
        playlists={playlists}
        sort={sort}
        setSort={setSort}
        filtered={filtered}
      />
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
      ) : loading ? (
        <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)' }}>Nothing here yet.</p>
      ) : (
        filtered.map((song, index) => (
          <LibraryRow
            key={song.id}
            song={song}
            active={activeSongId === song.id && engine.mode !== 'idle'}
            onPlay={() => playSong(song, index)}
            onOpen={() => {
              setNowPlaying(song)
              if (desktopSplit) playSong(song, index)
              else setPlayerOpen(true)
            }}
          />
        ))
      )}
    </>
  )

  const playerBar = activeSongMeta && engine.mode !== 'idle' ? (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '12px',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--surface-2)',
      }}>
        {activeSongMeta.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeSongMeta.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.name, margin: 0, fontWeight: 600 }}>{activeSongMeta.title}</p>
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, margin: '2px 0 0', color: 'var(--text-muted)' }}>{activeSongMeta.artist}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <span style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.time, color: 'var(--text-muted)' }}>{formatClock(engine.currentTime)}</span>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{
              width: `${engine.duration > 0 ? (100 * engine.currentTime) / engine.duration : 0}%`,
              height: '100%',
              background: 'var(--gold)',
            }} />
          </div>
          <span style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.time, color: 'var(--text-muted)' }}>{formatClock(engine.duration)}</span>
        </div>
      </div>
      <button type="button" aria-label="Previous" disabled={!canPrev} onClick={() => queuePrev()} style={{ background: 'none', border: 'none', color: 'var(--gold)', opacity: canPrev ? 1 : 0.35, cursor: canPrev ? 'pointer' : 'default' }}>‹</button>
      <button type="button" aria-label={engine.playing ? 'Pause' : 'Play'} onClick={() => togglePlayPause()} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}>
        <PlayPauseIcon playing={engine.playing} size={24} color="currentColor" />
      </button>
      <button type="button" aria-label="Next" disabled={!canNext} onClick={() => queueNext()} style={{ background: 'none', border: 'none', color: 'var(--gold)', opacity: canNext ? 1 : 0.35, cursor: canNext ? 'pointer' : 'default' }}>›</button>
      {activeSongId ? (
        <button
          type="button"
          aria-label={isLiked(activeSongId) ? 'Unlike' : 'Like'}
          onClick={() => void toggleLike(activeSongId)}
          style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.chip, fontWeight: 700 }}
        >
          {isLiked(activeSongId) ? 'Liked' : 'Like'}
        </button>
      ) : null}
    </div>
  ) : null

  if (desktopSplit) {
    return (
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 'calc(100vh - var(--nav-height, 72px))',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{
            width: 'min(420px, 42vw)',
            borderRight: '1px solid var(--border)',
            padding: '12px 16px',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}>
            {listSection}
          </div>
          <div style={{
            flex: 1,
            padding: '24px 32px',
            overflowY: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}>
            <div style={{ maxWidth: '520px', width: '100%' }}>
              <LibraryLyricLines
                songId={activeSongId}
                currentTime={engine.currentTime}
                maxLines={99}
                large
              />
            </div>
          </div>
        </div>
        {playerBar}
      </div>
    )
  }

  return (
    <>
      {listSection}
      {playerOpen && nowPlaying ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          background: 'var(--bg)',
          padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 20px var(--margo-page-padding-bottom)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={() => setPlayerOpen(false)} aria-label="Close player" style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '1.2rem', cursor: 'pointer' }}>
              ↓
            </button>
            <span style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)' }}>Now playing</span>
            <CardOverflowMenu
              items={[
                { id: 'open', label: 'Open full song', onSelect: () => { window.location.href = `/song/${nowPlaying.id}` } },
              ]}
            />
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
          <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.name, fontWeight: 600, margin: '0 0 4px', textAlign: 'center' }}>{nowPlaying.title}</p>
          <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', margin: '0 0 20px', textAlign: 'center' }}>{nowPlaying.artist}</p>
          <div style={{ width: '100%', maxWidth: '360px', marginBottom: '20px' }}>
            <LibraryLyricLines songId={activeSongId} currentTime={engine.currentTime} maxLines={3} large />
          </div>
          <div style={{ width: '100%', maxWidth: '360px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.time, color: 'var(--text-muted)' }}>{formatClock(engine.currentTime)}</span>
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'var(--surface-2)' }}>
              <div style={{
                width: `${engine.duration > 0 ? (100 * engine.currentTime) / engine.duration : 0}%`,
                height: '100%',
                background: 'var(--gold)',
              }} />
            </div>
            <span style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.time, color: 'var(--text-muted)' }}>{formatClock(engine.duration)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <button type="button" aria-label="Previous" disabled={!canPrev} onClick={() => queuePrev()} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '1.4rem', opacity: canPrev ? 1 : 0.35 }}>‹</button>
            <button type="button" aria-label={engine.playing ? 'Pause' : 'Play'} onClick={() => togglePlayPause()} style={{ background: 'var(--gold)', border: 'none', borderRadius: '50%', width: 52, height: 52, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayPauseIcon playing={engine.playing} size={22} color="var(--bg)" />
            </button>
            <button type="button" aria-label="Next" disabled={!canNext} onClick={() => queueNext()} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '1.4rem', opacity: canNext ? 1 : 0.35 }}>›</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button type="button" onClick={() => void toggleLike(nowPlaying.id)} style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.chip }}>
              {isLiked(nowPlaying.id) ? 'Liked' : 'Like'}
            </button>
            <button type="button" onClick={() => void toggleListenLater(nowPlaying.id)} style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.chip }}>
              {isListenLater(nowPlaying.id) ? 'In Listen later' : 'Listen later'}
            </button>
            <Link href="/compose" style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid var(--gold-border)', background: 'var(--gold-faint)', color: 'var(--gold)', fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.chip, textDecoration: 'none', fontWeight: 600 }}>
              Share a moment
            </Link>
          </div>
        </div>
      ) : null}
    </>
  )
}

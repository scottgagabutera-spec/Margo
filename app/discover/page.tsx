'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { PendingNavLink } from '@/components/pending-nav-link'
import Image from 'next/image'
import { useSongs, Song } from '@/hooks/useSongs'
import { useLyricMoments } from '@/hooks/useLyricMoments'
import type { LyricMomentRow } from '@/hooks/useLyricMoments'
import { useIsPlaying, useIsBuffering } from '@/hooks/useAudioEngine'
import { useWarmAudioUrlOnVisible } from '@/hooks/useWarmAudioUrl'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/hooks/usePosts'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { HeartIcon } from '@/components/heart-icon'
import { SongCardActions } from '@/components/song-card-actions'
import { AiGeneratedLabel } from '@/components/ai-generated-label'
import { SongPreviewSheet } from '@/components/song-preview-sheet'
import { LyricMomentCard } from '@/components/lyric-moment-card'
import { ResonanceCard } from '@/components/resonance-card'
import { CloseIcon } from '@/components/icons'
import { SaveQueueButton } from '@/components/save-queue-button'
import { stop as engineStop, warmUrls, subscribeAudioEngine, togglePlayPause } from '@/lib/audio-engine'
import { DISCOVER_VIBES, discoverVibeColor } from '@/lib/discover-vibes'
import { buildLyricMomentsFromRows, type LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentPool, queueLyricMoment } from '@/lib/lyric-moment-playback'
import { playResonancePost, queueResonancePost } from '@/lib/resonance-snippet'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useNotifications } from '@/hooks/useNotifications'
import { useMessaging } from '@/hooks/useMessaging'
import { createClient } from '@/lib/supabase/client'
import { MargoSearchInput } from '@/components/margo-search-input'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { NewItemsPill } from '@/components/new-items-pill'
import { useNewItemsBuffer } from '@/hooks/useNewItemsBuffer'
import { usePrimaryTab } from '@/components/primary-tab-shell'
import { DiscoverPageSkeleton } from '@/components/margo-skeletons'
import { catalogRankIds } from '@/lib/catalog-rank'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'

const supabase = createClient()

const VIBES = DISCOVER_VIBES
function vibeColor(vibe: string | null | undefined): string {
  return discoverVibeColor(vibe)
}

// Earned-tag thresholds for the Songs row — mirrors the Feed pattern
// (badge only if a song actually qualifies, never permanent chrome).
// "New" is intentionally left out — Song doesn't expose a createdAt/
// timestamp field in what's been reviewed so far. Add it back once
// that field is confirmed to exist.
// Home row: at most 3 earned badges, and only with real plays/resonates
// or lyric uses (see lib/catalog-rank.ts). Zero-stat songs never qualify.
const RANK_BADGE_COUNT = 3


// Below this many artists, a dedicated Artists row reads as empty
// rather than inviting — so it stays lower in the page order. Once the
// roster crosses this line, move ArtistsSection higher (e.g. right
// after Lyric Moments) so it can actually do promotion work.
const ARTIST_ROW_PROMOTE_THRESHOLD = 5


interface ArtistPreview {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

interface TakeoverState {
  open: boolean
  index: number
  pool: LyricMoment[]
  label: string
  // Which Mixtape (by vibe) this takeover was opened from, if any — threaded
  // through to playMoment on every advance so the mini-player / mixtape row
  // highlighting stays correct even while browsing inside the takeover.
  mixtapeVibe: string | null
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Earned tag pill — reused across Songs row ──────────────────────────
function EarnedTag({ label }: { label: 'Trending' | 'Top' }) {
  return (
    <span style={{
      position: 'absolute', top: '8px', left: '8px',
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.55rem', fontWeight: 700,
      letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 8px',
      borderRadius: '50px', background: 'rgba(7,6,10,0.75)',
      border: '1px solid var(--gold-border)', color: 'var(--gold)',
      zIndex: 2,
    }}>{label}</span>
  )
}

// ── Section header — shared by every row ────────────────────────────────
function RowHeader({ title, subtitle, viewMoreHref, onViewMore }: {
  title: string
  subtitle?: string
  viewMoreHref?: string
  onViewMore?: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '14px', gap: '12px' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</p>
        {subtitle && (
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {viewMoreHref ? (
        <Link href={viewMoreHref} style={{
          fontFamily: 'var(--font-lora), serif', fontSize: '0.56rem', fontWeight: 700,
          letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)',
          textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
        }}>View more →</Link>
      ) : onViewMore ? (
        <button onClick={onViewMore} style={{
          fontFamily: 'var(--font-lora), serif', fontSize: '0.56rem', fontWeight: 700,
          letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)',
          background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', padding: 0,
        }}>View more →</button>
      ) : null}
    </div>
  )
}

// ── Lyric Moments row ─────────────────────────────────────────────────
function LyricMomentsSection({ moments, playingKey, bufferingKey, onOpenTakeover, onPlayMoment, onQueueMoment, onSelectVibe, selectedVibe }: {
  moments: LyricMoment[]
  playingKey: string | null
  bufferingKey: string | null
  onOpenTakeover: (pool: LyricMoment[], index: number) => void
  onPlayMoment: (moment: LyricMoment, pool: LyricMoment[]) => void
  onQueueMoment: (moment: LyricMoment, mode: 'next' | 'add') => void
  onSelectVibe: (vibe: string) => void
  selectedVibe: string
}) {
  const preview = moments.slice(0, 12)

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader
        title="Lyric Moments"
        subtitle="Lines picked for how they feel, not just what's playing"
        viewMoreHref="/discover/moments"
      />

      {preview.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No lines tagged for {selectedVibe} yet.
        </p>
      ) : (
        <div className="row-scroll">
          {preview.map((moment, i) => (
            <LyricMomentCard
              key={`${moment.songId}_${moment.lineId}`}
              moment={moment}
              isPlaying={playingKey === `${moment.songId}_${moment.lineId}`}
              isBuffering={bufferingKey === `${moment.songId}_${moment.lineId}`}
              onClick={() => onOpenTakeover(moments, i)}
              onPlay={(e) => { e.stopPropagation(); onPlayMoment(moment, moments) }}
              onSelectVibe={onSelectVibe}
              onPlayNext={() => onQueueMoment(moment, 'next')}
              onAddQueue={() => onQueueMoment(moment, 'add')}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Lyric Mixtapes card — full vibe-color fill, one per vibe ──────────
// FIX: the play circle is now a real <button> with its own onClick and
// stopPropagation, instead of a plain decorative <div>. Previously the
// card's single onClick (which opens the takeover) caught every tap,
// including taps on the circle, so there was no way to just play a
// mixtape without opening the full-screen takeover.
function MixtapeCard({ vibe, count, sampleLine, onClick, onPlay, isPlaying, isBuffering }: {
  vibe: string
  count: number
  sampleLine: string
  onClick: () => void
  onPlay: (e: React.MouseEvent) => void
  isPlaying: boolean
  isBuffering?: boolean
}) {
  const color = vibeColor(vibe)
  return (
    <div
      onClick={onClick}
      style={{
        flexShrink: 0, width: '220px', scrollSnapAlign: 'start', cursor: 'pointer',
        padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', minHeight: '180px', boxSizing: 'border-box',
        background: `linear-gradient(160deg, ${color}30 0%, ${color}0a 100%)`,
        border: `1px solid ${color}45`,
        boxShadow: `0 10px 30px ${color}1a`,
      }}
    >
      <div>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '1.05rem',
          color, letterSpacing: '0.5px', textTransform: 'capitalize', margin: '0 0 8px',
        }}>{vibe.charAt(0) + vibe.slice(1).toLowerCase()} Mixtape</p>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.78rem',
          color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>&ldquo;{sampleLine}&rdquo;</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
          color: 'rgba(255,255,255,0.55)', letterSpacing: '1px', textTransform: 'uppercase',
        }}>{count} {count === 1 ? 'moment' : 'moments'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(e) }}
          style={{
            width: '34px', height: '34px', borderRadius: '50%', background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <PlayPauseIcon playing={isPlaying} buffering={!!isBuffering} size={14} color="var(--bg)" />
        </button>
      </div>
    </div>
  )
}

// ── Lyric Mixtapes row — one card per vibe, full lines queued in order.
// Reuses the same takeover + queue mechanics as Lyric Moments instead of
// duplicating audio logic: tapping a mixtape's card body opens the
// takeover with that vibe's full moment pool. Tapping the play circle
// instead plays the mixtape's queue directly, without opening the
// takeover. ─────────────────────────────────────────────────────────
function LyricMixtapesSection({ allMoments, onOpenTakeover, onPlayMixtape, playingVibe, bufferingVibe }: {
  allMoments: LyricMoment[]
  onOpenTakeover: (pool: LyricMoment[], index: number, label: string, vibe: string) => void
  onPlayMixtape: (vibe: string, pool: LyricMoment[], e: React.MouseEvent) => void
  playingVibe: string | null
  bufferingVibe: string | null
}) {
  const mixtapes = useMemo(() => {
    return VIBES.filter(v => v !== 'ALL').map(vibe => {
      const pool = allMoments.filter(m => m.vibes.includes(vibe))
      return { vibe, pool }
    }).filter(m => m.pool.length > 0)
  }, [allMoments])

  if (mixtapes.length === 0) return null

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader title="Lyric Mixtapes" subtitle="Every moment for one mood, queued and ready" />
      <div className="row-scroll">
        {mixtapes.map(({ vibe, pool }) => (
          <MixtapeCard
            key={vibe}
            vibe={vibe}
            count={pool.length}
            sampleLine={pool[0].line}
            isPlaying={playingVibe === vibe}
            isBuffering={bufferingVibe === vibe}
            onClick={() => onOpenTakeover(pool, 0, `${vibe} Mixtape`, vibe)}
            onPlay={(e) => onPlayMixtape(vibe, pool, e)}
          />
        ))}
      </div>
    </section>
  )
}

// ── Resonance row ────────────────────────────────────────────────────
function ResonanceSection({ posts, songs, selectedVibe, onSelectVibe }: {
  posts: Post[]
  songs: Song[]
  selectedVibe: string
  onSelectVibe: (vibe: string) => void
}) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [bufferingId, setBufferingId] = useState<string | null>(null)
  const { requireAuth } = useAuthGate()
  const songsById = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs])

  const resonances = useMemo(() => {
    const base = posts.filter(p => p.songId && p.text)
    const filtered = selectedVibe === 'ALL'
      ? base
      : base.filter(p => (p.emotion || '').toUpperCase() === selectedVibe)
    return filtered.slice(0, 12)
  }, [posts, selectedVibe])

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (!state.playing || state.mode !== 'snippet') {
        setPlayingId(null)
        setBufferingId(null)
        return
      }
      const match = resonances.find(p => p.songId === state.songId && p.text === state.snippet?.lineText)
      setPlayingId(match?.id ?? null)
      setBufferingId(state.buffering && match ? match.id : null)
    })
  }, [resonances])

  const playResonance = (post: Post, e: React.MouseEvent) => {
    e.preventDefault()
    if (!post.songId) return
    playResonancePost(post, songsById.get(post.songId))
  }

  const queueResonance = (post: Post, mode: 'next' | 'add') => {
    if (!requireAuth()) return
    if (!post.songId) return
    queueResonancePost(post, songsById.get(post.songId), mode)
  }

  if (resonances.length === 0) return null

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader title="Resonance" subtitle="What people are saying, using songs" viewMoreHref="/discover/resonance" />
      <div className="row-scroll">
        {resonances.map(post => (
          <ResonanceCard key={post.id} post={post} isPlaying={playingId === post.id} isBuffering={bufferingId === post.id} onPlay={(e) => playResonance(post, e)} onSelectVibe={onSelectVibe} onPlayNext={() => queueResonance(post, 'next')} onAddQueue={() => queueResonance(post, 'add')} />
        ))}
      </div>
    </section>
  )
}

// ── Songs card — used in the Songs row ──────────────────────────────────
function SongRowCard({ song, badge, onPreview }: { song: Song; badge: 'Trending' | 'Top' | null; onPreview: (song: Song) => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isActive = song.status === 'live' || song.status === 'active'
  const isPlayingThisSong = useIsPlaying(song.id)
  const isBuffering = useIsBuffering(song.id)
  useWarmAudioUrlOnVisible(song.audioUrl, cardRef, isActive && !!song.audioUrl)
  return (
    <div ref={cardRef} style={{ flexShrink: 0, width: '160px', scrollSnapAlign: 'start', cursor: 'pointer' }} onClick={() => onPreview(song)}>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        {badge && <EarnedTag label={badge} />}
        {song.artwork ? (
          <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} sizes="160px" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.03))' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,6,10,0.85) 0%, transparent 55%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '10px', pointerEvents: 'none' }}>
          {isActive && (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayPauseIcon playing={isPlayingThisSong} buffering={isBuffering} size={14} color="var(--bg)" />
            </div>
          )}
        </div>
        <SongCardActions song={song} placement="cover" />
      </div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--text-secondary)', marginBottom: '2px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0 }}>{song.artist}</p>
    </div>
  )
}

// ── Songs row ────────────────────────────────────────────────────────
function SongsSection({ songs, onPreview }: { songs: Song[]; onPreview: (song: Song) => void }) {
  const { trendingIds, topIds } = useMemo(
    () => catalogRankIds(songs, RANK_BADGE_COUNT),
    [songs]
  )

  if (songs.length === 0) return null

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader title="Songs" subtitle="New and trending across Margo" viewMoreHref="/discover/songs" />
      <div className="row-scroll">
        {songs.map(song => (
          <SongRowCard
            key={song.id}
            song={song}
            badge={topIds.has(song.id) ? 'Top' : trendingIds.has(song.id) ? 'Trending' : null}
            onPreview={onPreview}
          />
        ))}
      </div>
    </section>
  )
}

// ── Artists row ──────────────────────────────────────────────────────
function ArtistsSection() {
  const [artists, setArtists] = useState<ArtistPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('is_artist', true)
      .limit(12)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('Failed to load artists:', error); setLoading(false); return }
        setArtists((data || []).map(p => ({
          id: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url,
        })))
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (!loading && artists.length === 0) return null

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader title="Artists" subtitle="Independent artists on Margo" viewMoreHref="/artists" />
      {loading ? (
        <div className="row-scroll">
          {Array(6).fill(null).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: '96px', textAlign: 'center' }}>
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="row-scroll">
          {artists.map(artist => (
            <PendingNavLink key={artist.id} href={`/profile/${artist.username || ''}`} style={{ flexShrink: 0, width: '96px', textAlign: 'center', textDecoration: 'none', borderRadius: '12px' }}>
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 10px', border: '1px solid rgba(232,197,71,0.25)', background: 'linear-gradient(135deg, rgba(232,197,71,0.2), rgba(232,197,71,0.05))' }}>
                {artist.avatarUrl ? (
                  <img src={artist.avatarUrl} alt={artist.displayName || artist.username || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {(artist.displayName || artist.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                {artist.displayName || artist.username}
              </p>
            </PendingNavLink>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Search results ───────────────────────────────────────────────────
// Client-side interim search across song title/artist AND lyric line
// text. This is a stopgap for real Postgres full-text/trigram search
// (flagged in the redesign doc as a separate backend pass) — functional
// now, but should be swapped for a server query once that ships.
// Matching-lyric links now point at /song/[id]?t=<startSec> — the
// song page can read the optional t= query param to seek to that
// line on load. id and audio URL no longer travel through the URL.
function SearchResults({
  query,
  songs,
  moments,
  onPreviewSong,
}: {
  query: string
  songs: Song[]
  moments: LyricMomentRow[]
  onPreviewSong: (song: Song) => void
}) {
  const q = query.toLowerCase().trim()

  const matchedSongs = useMemo(
    () => songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)),
    [songs, q]
  )

  const matchedLines = useMemo(() => {
    const results: { songId: string; songTitle: string; artist: string; line: string; start: number }[] = []
    moments.forEach(m => {
      if (m.text.toLowerCase().includes(q)) {
        results.push({
          songId: m.songId,
          songTitle: m.songTitle,
          artist: m.artist,
          line: m.text,
          start: m.startSec,
        })
      }
    })
    return results.slice(0, 20)
  }, [moments, q])

  if (matchedSongs.length === 0 && matchedLines.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Nothing found for &ldquo;{query}&rdquo;
        </p>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: '32px' }}>
      {matchedLines.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Matching lyrics</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matchedLines.map((m, i) => (
              <PendingNavLink key={i} href={`/song/${m.songId}?t=${Math.floor(m.start)}`} style={{ textDecoration: 'none', borderRadius: '12px' }}>
                <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text)', marginBottom: '6px' }}>&ldquo;{m.line}&rdquo;</p>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>{m.songTitle} · {m.artist}</p>
                </div>
              </PendingNavLink>
            ))}
          </div>
        </section>
      )}
      {matchedSongs.length > 0 && (
        <section>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Songs & artists</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {matchedSongs.map(song => (
              <div key={song.id} style={{ cursor: 'pointer' }} onClick={() => onPreviewSong(song)}>
                <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                  {song.artwork ? <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} sizes="140px" /> : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)' }} />}
                </div>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0 }}>{song.artist}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const { isTabActive } = usePrimaryTab()
  const discoverLive = isTabActive('discover')
  const { songs, loading, refetch } = useSongs({ enabled: discoverLive })
  const {
    moments: momentRows,
    songAtomsBySongId,
    refetch: refetchMoments,
  } = useLyricMoments({ enabled: discoverLive })
  const { posts: livePosts, reload: reloadPosts } = usePosts({ enabled: discoverLive })
  const {
    items: posts,
    pendingCount,
    flushPending,
    applyImmediate,
  } = useNewItemsBuffer(livePosts)
  const [ptrBusy, setPtrBusy] = useState(false)
  const [preview, setPreview] = useState<Song | null>(null)
  const [search, setSearch] = useState('')


  // ── Shared vibe filter — replaces the old permanent ALL/CHILL/HOPE/...
  // pill row. Set by tapping a vibe tag on any Moment or Resonance card;
  // shown as a single dismissible chip instead of a row that's always
  // taking up space, same pattern app/feed/page.tsx already uses. Tap the
  // chip itself to clear back to ALL.
  const [selectedVibe, setSelectedVibe] = useState('ALL')

  // ── Lyric Moments — computed once per songs load, shuffled once so
  // order doesn't reshuffle on every render/filter change. ──────────
  const [allMoments, setAllMoments] = useState<LyricMoment[]>([])
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [bufferingKey, setBufferingKey] = useState<string | null>(null)
  const { requireAuth } = useAuthGate()
  const { refetch: refetchNotifications } = useNotifications()
  const { refetch: refetchMessages } = useMessaging()
  const playingRef = useRef(false)

  // ── Active Mixtape tracking ────────────────────────────────────────
  // Which vibe-mixtape (if any) is the currently active queue. Tracked
  // explicitly here instead of inferred from the playing moment's own
  // vibe tags — a moment can carry multiple vibes (e.g. ['love',
  // 'nostalgia']), so inferring "which mixtape is playing" from
  // moment.vibes[0] was unreliable: it reflected the moment's own
  // primary tag, not which mixtape queue the person actually started.
  // Cleared whenever playback stops or moves to something that isn't
  // this mixtape (a different mixtape, or a plain Lyric Moment tap).
  const [activeMixtapeVibe, setActiveMixtapeVibe] = useState<string | null>(null)

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (state.mode === 'idle') setActiveMixtapeVibe(null)
    })
  }, [])

  useEffect(() => {
    setAllMoments(buildLyricMomentsFromRows(momentRows, songAtomsBySongId))
  }, [momentRows, songAtomsBySongId])

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (!state.playing || state.mode === 'idle' || state.mode === 'full') {
        setPlayingKey(null)
        setBufferingKey(null)
      } else if (state.snippet) {
        const key = `${state.songId}_${state.snippet.lineIndex}`
        setPlayingKey(key)
        setBufferingKey(state.buffering ? key : null)
      }
    })
  }, [])

  useEffect(() => {
    if (songs.length === 0) return
    const urls = songs.map(s => s.audioUrl).filter((u): u is string => !!u)
    warmUrls(urls)
  }, [songs])

  const filteredMoments = useMemo(
    () => selectedVibe === 'ALL' ? allMoments : allMoments.filter(m => m.vibes.includes(selectedVibe)),
    [allMoments, selectedVibe]
  )

  // playMoment now takes an optional mixtapeVibe tag identifying which
  // Mixtape (if any) this play originates from — threaded through to
  // activeMixtapeVibe so the Mixtape row highlighting stays accurate
  // regardless of which of a moment's several vibe tags happens to be
  // first. A plain Lyric Moment tap (no mixtapeVibe passed) correctly
  // clears any previously-active mixtape highlight.
  const playMoment = useCallback((moment: LyricMoment, pool: LyricMoment[], mixtapeVibe?: string | null) => {
    if (!moment.audioUrl) return
    if (playingRef.current) return
    playingRef.current = true
    setTimeout(() => { playingRef.current = false }, 80)

    setActiveMixtapeVibe(mixtapeVibe ?? null)
    playLyricMomentPool(moment, pool)
  }, [])

  const queueMoment = useCallback((moment: LyricMoment, mode: 'next' | 'add') => {
    if (!requireAuth()) return
    queueLyricMoment(moment, mode)
  }, [requireAuth])

  // FIX: tapping a Mixtape's play circle now checks whether that exact
  // mixtape is already the active queue first. If so, this just toggles
  // pause/resume in place — previously every tap unconditionally called
  // playMoment(pool[0], pool), which meant re-tapping a mixtape that was
  // already 6 songs deep into its own rotation would silently restart it
  // from song #1, killing the rotation instead of pausing/resuming it.
  const playMixtape = useCallback((vibe: string, pool: LyricMoment[], e: React.MouseEvent) => {
    e.stopPropagation()
    if (pool.length === 0) return
    if (activeMixtapeVibe === vibe) {
      togglePlayPause()
      return
    }
    playMoment(pool[0], pool, vibe)
  }, [playMoment, activeMixtapeVibe])

  // ── Takeover — shared by Lyric Moments AND Lyric Mixtapes. Each just
  // hands in whichever pool + starting index applies; no duplicated
  // audio-queue logic between the two rows. ─────────────────────────
  const [takeover, setTakeover] = useState<TakeoverState>({ open: false, index: 0, pool: [], label: 'Mix', mixtapeVibe: null })

  const openTakeover = useCallback((pool: LyricMoment[], index: number, label?: string, mixtapeVibe?: string) => {
    if (pool.length === 0) return
    const vibeTag = mixtapeVibe ?? null
    setTakeover({ open: true, index, pool, label: label || (selectedVibe === 'ALL' ? 'Mix' : `${selectedVibe} Mix`), mixtapeVibe: vibeTag })
    playMoment(pool[index], pool, vibeTag)
  }, [playMoment, selectedVibe])

  const advanceTakeover = useCallback((dir: 1 | -1) => {
    setTakeover(prev => {
      if (!prev.open || prev.pool.length === 0) return prev
      const next = (prev.index + dir + prev.pool.length) % prev.pool.length
      playMoment(prev.pool[next], prev.pool, prev.mixtapeVibe)
      return { ...prev, index: next }
    })
  }, [playMoment])

  const takeoverMoment = takeover.open ? takeover.pool[takeover.index] : null

  useEffect(() => {
    if (!takeover.open) return
    return subscribeAudioEngine(state => {
      if (!state.playing && state.mode === 'idle' && takeoverMoment) {
        advanceTakeover(1)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeover.open, takeoverMoment])


  const isSearching = search.trim().length > 0

  return (
    <PullToRefresh
      onRefreshingChange={setPtrBusy}
      onRefresh={async () => {
        const [, , latest] = await Promise.all([
          refetch(),
          refetchMoments(),
          reloadPosts(),
          refetchNotifications(),
          refetchMessages(),
        ])
        applyImmediate(latest)
      }}
    >
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', paddingTop: 'var(--nav-height, 72px)' }}>
      {!ptrBusy && pendingCount > 0 && (
        <NewItemsPill count={pendingCount} onReveal={flushPending} noun="new lyrics" />
      )}
      <style>{`
        .row-scroll {
          display: flex; gap: 12px; overflow-x: auto;
          scroll-snap-type: x proximity; padding-bottom: 4px;
        }
        .moment-card:active, .moment-card:focus-visible {
          border-color: rgba(232,197,71,0.2) !important;
          background: rgba(255,255,255,0.04) !important;
        }
        @media (hover: hover) and (pointer: fine) {
          .moment-card:hover { border-color: rgba(232,197,71,0.2) !important; background: rgba(255,255,255,0.04) !important; }
        }
        .music-search:focus { border-color: rgba(232,197,71,0.4) !important; outline: none; }
      `}</style>

      {preview && (
        <SongPreviewSheet
          song={preview}
          onClose={() => setPreview(null)}
        />
      )}

      {/* ── Takeover — full connected/swipeable Vibe Mix experience,
          shared by Lyric Moments and Lyric Mixtapes ── */}
      {takeover.open && takeoverMoment && (
        <div className="margo-preview-scrim" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: 'rgba(20,17,28,0.98)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: '20px', padding: '32px 28px', position: 'relative' }}>
            <button onClick={() => { engineStop(); setTakeover({ open: false, index: 0, pool: [], label: 'Mix', mixtapeVibe: null }) }} style={{
              position: 'absolute', top: '16px', right: '16px',
              width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
            }}><CloseIcon size={14} color="var(--text-secondary)" /></button>

            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '18px' }}>
              {takeover.label} · auto-continues
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', color: 'var(--text)', lineHeight: 1.45, marginBottom: '14px', whiteSpace: 'pre-line' }}>
              &ldquo;{takeoverMoment.line}&rdquo;
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '22px' }}>
              {takeoverMoment.songTitle} · {takeoverMoment.artist}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <SaveQueueButton defaultTitle={takeover.label} />
              <Link
                href={`/compose?lyric=${encodeURIComponent(takeoverMoment.line)}&song=${encodeURIComponent(takeoverMoment.songTitle)}&artist=${encodeURIComponent(takeoverMoment.artist)}&songId=${encodeURIComponent(takeoverMoment.songId)}&audioUrl=${encodeURIComponent(takeoverMoment.audioUrl || '')}&start=${takeoverMoment.start}&end=${takeoverMoment.end}&phase=moment&source=discover`}
                onClick={(e) => { if (!requireAuth()) e.preventDefault() }}
                style={{
                  padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700,
                  letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', textDecoration: 'none',
                }}
              >Send a line</Link>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => advanceTakeover(-1)} style={{
                minHeight: 'var(--margo-touch-min)', padding: '0 26px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
                fontSize: '0.56rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              }}>← Back</button>
              <button onClick={() => advanceTakeover(1)} style={{
                minHeight: 'var(--margo-touch-min)', padding: '0 26px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
                fontSize: '0.56rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              }}>Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky unified search — the only page-wide sticky element now.
          top now reads the same measured nav height as the page's own
          paddingTop above, instead of a hardcoded 56px guess that
          undershot the real fixed-nav height and let this bar (and the
          "Lyric Moments" title / vibe-filter chip below it) drift
          under the nav on load. */}
      <div style={{ position: 'sticky', top: 'var(--nav-height, 72px)', zIndex: 30, background: 'var(--bg)', padding: 'clamp(20px, 5vw, 40px) 16px 16px' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <MargoSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search lyrics, songs, artists…"
          />
        </div>
      </div>

      <div style={{ padding: '0 16px 32px', width: '100%', maxWidth: '72rem', margin: '0 auto', boxSizing: 'border-box' }}>
        {isSearching ? (
          <SearchResults query={search} songs={songs} moments={momentRows} onPreviewSong={setPreview} />
        ) : loading ? (
          <DiscoverPageSkeleton />
        ) : (
          <>
            {/* Dismissible vibe-filter chip — replaces the old permanent
                pill row. Only appears once a vibe tag has been tapped on
                a Moment or Resonance card. Tap the chip itself (or its
                built-in × ) to clear the filter back to ALL. */}
            {selectedVibe !== 'ALL' && (
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => setSelectedVibe('ALL')}
                  aria-label={`Clear ${selectedVibe} filter`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 12px', borderRadius: '50px',
                    background: vibeColor(selectedVibe), border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.56rem', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--bg)',
                  }}
                >Filtering: {selectedVibe} <CloseIcon size={10} color="var(--bg)" /></button>
              </div>
            )}

            <LyricMomentsSection
              moments={filteredMoments}
              playingKey={playingKey}
              bufferingKey={bufferingKey}
              onOpenTakeover={(pool, index) => openTakeover(pool, index)}
              onPlayMoment={playMoment}
              onQueueMoment={queueMoment}
              onSelectVibe={setSelectedVibe}
              selectedVibe={selectedVibe}
            />
            <SongsSection songs={songs} onPreview={setPreview} />
            <ResonanceSection posts={posts} songs={songs} selectedVibe={selectedVibe} onSelectVibe={setSelectedVibe} />
            <LyricMixtapesSection
              allMoments={allMoments}
              onOpenTakeover={openTakeover}
              onPlayMixtape={playMixtape}
              playingVibe={playingKey && !takeoverMoment ? activeMixtapeVibe : null}
              bufferingVibe={bufferingKey && !takeoverMoment ? activeMixtapeVibe : null}
            />
            <ArtistsSection />
          </>
        )}
      </div>
    </div>
    </PullToRefresh>
  )
}
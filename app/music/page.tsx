'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSongs, Song } from '@/hooks/useSongs'
import { useSharedLines } from '@/hooks/useSharedLines'
import { useIsPlaying } from '@/hooks/useAudioEngine'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/hooks/usePosts'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { HeartIcon } from '@/components/heart-icon'
import { CloseIcon } from '@/components/icons'
import { SaveQueueButton } from '@/components/save-queue-button'
import { playSnippet as enginePlaySnippet, stop as engineStop, setQueue, warmUrl, warmUrls, subscribeAudioEngine } from '@/lib/audio-engine'
import { getMargoActorId } from '@/lib/engagement/session'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

const VIBES = ['ALL', 'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL', 'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD']

// Earned-tag thresholds for the Songs row — mirrors the Feed pattern
// (badge only if a song actually qualifies, never permanent chrome).
// "New" is intentionally left out — Song doesn't expose a createdAt/
// timestamp field in what's been reviewed so far. Add it back once
// that field is confirmed to exist.
const RANK_BADGE_COUNT = 8

// Minimum word count for a lyric line to be eligible as a Lyric Moment.
// This ONLY gates what Margo curates into the Moments row/takeover —
// it never restricts what a person can post as a Resonance. A short
// line is a perfectly valid thing to say; it's just not always a
// strong enough fragment to stand alone as a curated card.
const MIN_MOMENT_WORDS = 4

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

interface LyricMoment {
  line: string
  start: number
  end: number
  lineId: number
  songId: string
  songTitle: string
  artist: string
  artwork?: string | null
  audioUrl?: string | null
  vibes: string[]
}

interface ArtistPreview {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function StatBlock({ value, label, gold }: { value: number; label: string; gold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '52px' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.4rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text)', lineHeight: 1, margin: 0 }}>{formatNum(value)}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '5px', opacity: gold ? 0.7 : 1 }}>{label}</p>
    </div>
  )
}

function SmallStatBlock({ value, label, gold }: { value: number; label: string; gold?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text)', margin: 0 }}>{formatNum(value)}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text-3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '3px', opacity: gold ? 0.7 : 1 }}>{label}</p>
    </div>
  )
}

// ── Earned tag pill — reused across Songs row ──────────────────────────
function EarnedTag({ label }: { label: 'Trending' | 'Top' }) {
  return (
    <span style={{
      position: 'absolute', top: '8px', left: '8px',
      fontFamily: 'var(--font-lora), serif', fontSize: '0.46rem', fontWeight: 700,
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
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', color: 'var(--text-3)', margin: '2px 0 0' }}>{subtitle}</p>
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

// ── Lyric Moment card — used in the horizontal row ──────────────────────
function MomentCard({ moment, isPlaying, onClick, onPlay }: {
  moment: LyricMoment
  isPlaying: boolean
  onClick: () => void
  onPlay: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className="moment-card"
      style={{
        flexShrink: 0, width: '240px', scrollSnapAlign: 'start',
        padding: '16px', background: isPlaying ? 'rgba(232,197,71,0.06)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isPlaying ? 'rgba(232,197,71,0.28)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
        cursor: 'pointer', transition: 'border-color 200ms ease, background 200ms ease',
      }}
    >
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.88rem',
        color: 'var(--text)', lineHeight: 1.5, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        minHeight: '4.2em',
      }}>&ldquo;{moment.line}&rdquo;</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{moment.songTitle}</p>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', margin: 0 }}>{formatTime(moment.start)}</p>
        </div>
        <button onClick={onPlay} style={{
          width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', flexShrink: 0,
          background: isPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
          border: '1px solid rgba(232,197,71,0.25)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
        }}>
          <PlayPauseIcon playing={isPlaying} size={15} color="var(--gold)" />
        </button>
      </div>
    </div>
  )
}

// ── Lyric Moments row ─────────────────────────────────────────────────
// Scoped vibe chips live HERE, not page-wide — this is the one place
// that filter still matters. Manual tap-to-preview while browsing;
// "View more" opens the full connected/swipeable takeover.
//
// Eligibility: a line only qualifies as a Moment if it has at least
// MIN_MOMENT_WORDS words AND has vibes tagged. This is a curation gate
// for Margo's own picks only — it has no bearing on what someone can
// post as a Resonance (see ResonanceSection below), where any length
// is valid because it's the person's own choice, not Margo's pick.
function LyricMomentsSection({ songs }: { songs: Song[] }) {
  const [rowVibe, setRowVibe] = useState('ALL')
  const [allMoments, setAllMoments] = useState<LyricMoment[]>([])
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [takeover, setTakeover] = useState<{ open: boolean; index: number }>({ open: false, index: 0 })
  const { requireAuth } = useAuthGate()
  const playingRef = useRef(false)

  useEffect(() => {
    const moments: LyricMoment[] = []
    songs.forEach(song => {
      if (!song.lyricLines || song.lyricLines.length === 0) return
      song.lyricLines.forEach(line => {
        if (wordCount(line.text) < MIN_MOMENT_WORDS) return
        if (!line.vibes || line.vibes.length === 0) return
        moments.push({
          line: line.text, lineId: line.lineIndex,
          start: line.startSec, end: line.endSec,
          songId: song.id, songTitle: song.title, artist: song.artist,
          artwork: song.artwork, audioUrl: song.audioUrl, vibes: line.vibes,
        })
      })
    })
    for (let i = moments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [moments[i], moments[j]] = [moments[j], moments[i]]
    }
    setAllMoments(moments)
  }, [songs])

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (!state.playing || state.mode === 'idle' || state.mode === 'full') {
        setPlayingKey(null)
      } else if (state.snippet) {
        setPlayingKey(`${state.songId}_${state.snippet.lineIndex}`)
      }
    })
  }, [])

  const filtered = useMemo(
    () => rowVibe === 'ALL' ? allMoments : allMoments.filter(m => m.vibes.includes(rowVibe)),
    [allMoments, rowVibe]
  )
  const preview = filtered.slice(0, 12)

  const playMoment = useCallback((moment: LyricMoment, pool: LyricMoment[]) => {
    if (!moment.audioUrl) return
    const key = `${moment.songId}_${moment.lineId}`
    if (playingRef.current) return
    playingRef.current = true
    setTimeout(() => { playingRef.current = false }, 80)

    const queueItems = pool.filter(m => m.audioUrl).map(m => ({
      songId: m.songId, audioUrl: m.audioUrl!, title: m.songTitle, artist: m.artist,
      artwork: m.artwork ?? null, lineIndex: m.lineId, lineText: m.line,
      startSec: m.start, endSec: m.end, vibe: (m.vibes && m.vibes[0]) || null,
    }))
    const idx = queueItems.findIndex(q => q.songId === moment.songId && q.lineIndex === moment.lineId)
    setQueue(queueItems, idx >= 0 ? idx : 0)

    void enginePlaySnippet({
      songId: moment.songId, audioUrl: moment.audioUrl, title: moment.songTitle, artist: moment.artist,
      artwork: moment.artwork ?? null, lineIndex: moment.lineId, lineText: moment.line,
      startSec: moment.start, endSec: moment.end, vibe: (moment.vibes && moment.vibes[0]) || null,
      source: 'music-board',
    })
  }, [])

  const openTakeover = (index: number) => {
    setTakeover({ open: true, index })
    if (filtered[index]) playMoment(filtered[index], filtered)
  }

  const takeoverMoment = takeover.open ? filtered[takeover.index] : null

  const advanceTakeover = useCallback((dir: 1 | -1) => {
    if (filtered.length === 0) return
    const next = (takeover.index + dir + filtered.length) % filtered.length
    setTakeover({ open: true, index: next })
    playMoment(filtered[next], filtered)
  }, [filtered, takeover.index, playMoment])

  // Connected/auto-advancing playback inside the takeover — once someone
  // commits into the experience, snippets chain automatically rather
  // than requiring a tap per line.
  useEffect(() => {
    if (!takeover.open) return
    return subscribeAudioEngine(state => {
      if (!state.playing && state.mode === 'idle' && takeoverMoment) {
        advanceTakeover(1)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeover.open, takeoverMoment])

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader
        title="Lyric Moments"
        subtitle="Lines picked for how they feel, not just what's playing"
        onViewMore={() => openTakeover(0)}
      />

      <div className="vibe-pills-scroll" style={{ marginBottom: '14px' }}>
        {VIBES.map(v => (
          <button key={v} onClick={() => setRowVibe(v)} className="vibe-pill" style={{
            flexShrink: 0, minHeight: '30px', padding: '0 14px',
            display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
            background: rowVibe === v ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${rowVibe === v ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
            fontSize: '0.52rem', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
            color: rowVibe === v ? 'var(--bg)' : 'rgba(255,255,255,0.4)',
          }}>{v}</button>
        ))}
      </div>

      {preview.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.85rem' }}>
          No lines tagged for {rowVibe} yet.
        </p>
      ) : (
        <div className="row-scroll">
          {preview.map((moment, i) => (
            <MomentCard
              key={`${moment.songId}_${moment.lineId}`}
              moment={moment}
              isPlaying={playingKey === `${moment.songId}_${moment.lineId}`}
              onClick={() => openTakeover(i)}
              onPlay={(e) => { e.stopPropagation(); playMoment(moment, filtered) }}
            />
          ))}
        </div>
      )}

      {/* ── Takeover — full connected/swipeable Vibe Mix experience ── */}
      {takeover.open && takeoverMoment && (
        <div className="margo-preview-scrim" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '560px', background: 'rgba(20,17,28,0.98)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: '20px', padding: '32px 28px', position: 'relative' }}>
            <button onClick={() => { engineStop(); setTakeover({ open: false, index: 0 }) }} style={{
              position: 'absolute', top: '16px', right: '16px',
              width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
            }}><CloseIcon size={14} color="rgba(255,255,255,0.6)" /></button>

            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '18px' }}>
              {rowVibe === 'ALL' ? 'Mix' : `${rowVibe} Mix`} · auto-continues
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', color: 'var(--text)', lineHeight: 1.45, marginBottom: '14px' }}>
              &ldquo;{takeoverMoment.line}&rdquo;
            </p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '22px' }}>
              {takeoverMoment.songTitle} · {takeoverMoment.artist}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <SaveQueueButton defaultTitle={rowVibe === 'ALL' ? 'My Mix' : `${rowVibe} Mix`} />
              <Link
                href={`/compose?lyric=${encodeURIComponent(takeoverMoment.line)}&song=${encodeURIComponent(takeoverMoment.songTitle)}&artist=${encodeURIComponent(takeoverMoment.artist)}&songId=${encodeURIComponent(takeoverMoment.songId)}&audioUrl=${encodeURIComponent(takeoverMoment.audioUrl || '')}&start=${takeoverMoment.start}&end=${takeoverMoment.end}`}
                onClick={(e) => { if (!requireAuth()) e.preventDefault() }}
                style={{
                  padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700,
                  letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', textDecoration: 'none',
                }}
              >Post to Feed</Link>
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
    </section>
  )
}

// ── Resonance card — used in the Resonance row ──────────────────────────
function ResonanceCard({ post, isPlaying, onPlay }: {
  post: Post
  isPlaying: boolean
  onPlay: (e: React.MouseEvent) => void
}) {
  return (
    <Link
      href={`/lyric-back?postId=${post.id}`}
      style={{
        flexShrink: 0, width: '240px', scrollSnapAlign: 'start',
        padding: '16px', background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
        display: 'flex', flexDirection: 'column', gap: '10px', textDecoration: 'none',
      }}
    >
      <p style={{
        fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.88rem',
        color: 'var(--text)', lineHeight: 1.5, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        minHeight: '4.2em',
      }}>&ldquo;{post.text}&rdquo;</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {post.knowledge?.song || 'Margo'}
          </p>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            @{post.username || 'listener'}
          </p>
        </div>
        {post.audioUrl && (
          <button onClick={onPlay} style={{
            width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', flexShrink: 0,
            background: isPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
            border: '1px solid rgba(232,197,71,0.25)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
          }}>
            <PlayPauseIcon playing={isPlaying} size={15} color="var(--gold)" />
          </button>
        )}
      </div>
    </Link>
  )
}

// ── Resonance row ────────────────────────────────────────────────────
// Reuses the same usePosts() feed data — no new query needed. A
// Resonance is any real post with a songId attached (a snippet someone
// actually chose to post), regardless of length or vibe. Unlike Lyric
// Moments, nothing here is curated or word-count gated — this is the
// person's own choice, not Margo's pick. Someone saying hello with
// three words from a song still belongs here.
//
// Scope: currently global (most recent resonances across all of
// Margo), not limited to songs shown elsewhere on this page — this
// row is meant to answer "what's Margo talking about right now."
function ResonanceSection({ posts }: { posts: Post[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null)

  const resonances = useMemo(
    () => posts.filter(p => p.songId && p.text).slice(0, 12),
    [posts]
  )

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (!state.playing || state.mode !== 'snippet') { setPlayingId(null); return }
      const match = resonances.find(p => p.songId === state.songId && p.text === state.snippet?.lineText)
      setPlayingId(match?.id ?? null)
    })
  }, [resonances])

  const playResonance = (post: Post, e: React.MouseEvent) => {
    e.preventDefault()
    if (!post.audioUrl || !post.songId) return
    void enginePlaySnippet({
      songId: post.songId, audioUrl: post.audioUrl, title: post.knowledge?.song || '', artist: post.knowledge?.artist || '',
      artwork: post.knowledge?.artwork ?? null, lineIndex: 0, lineText: post.text || '',
      startSec: post.snippetStart ?? 0, endSec: post.snippetEnd ?? 5,
      vibe: null, source: 'music-resonance-row',
    })
  }

  if (resonances.length === 0) return null

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader title="Resonance" subtitle="What people are saying, using songs" viewMoreHref="/feed" />
      <div className="row-scroll">
        {resonances.map(post => (
          <ResonanceCard key={post.id} post={post} isPlaying={playingId === post.id} onPlay={(e) => playResonance(post, e)} />
        ))}
      </div>
    </section>
  )
}

// ── Songs card — used in the Songs row ──────────────────────────────────
function SongRowCard({ song, badge, onPreview }: { song: Song; badge: 'Trending' | 'Top' | null; onPreview: (song: Song) => void }) {
  const isActive = song.status === 'live' || song.status === 'active'
  const isPlayingThisSong = useIsPlaying(song.id)
  return (
    <div style={{ flexShrink: 0, width: '160px', scrollSnapAlign: 'start', cursor: 'pointer' }} onClick={() => onPreview(song)}>
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        {badge && <EarnedTag label={badge} />}
        {song.artwork ? (
          <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} sizes="160px" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(232,197,71,0.08), rgba(255,255,255,0.03))' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(7,6,10,0.85) 0%, transparent 55%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '10px' }}>
          {isActive && (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayPauseIcon playing={isPlayingThisSong} size={14} color="var(--bg)" />
            </div>
          )}
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', fontWeight: 600, color: isActive ? 'var(--text)' : 'var(--text-3)', marginBottom: '2px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
      <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-3)', margin: 0 }}>{song.artist}</p>
    </div>
  )
}

// ── Songs row ────────────────────────────────────────────────────────
function SongsSection({ songs, onPreview }: { songs: Song[]; onPreview: (song: Song) => void }) {
  // Trending = engagement relative to catalog; Top = raw lyricUses.
  // "New" intentionally omitted — see note at top of file.
  const { trendingIds, topIds } = useMemo(() => {
    const byEngagement = [...songs].sort((a, b) => ((b.plays || 0) + (b.resonates || 0) * 3) - ((a.plays || 0) + (a.resonates || 0) * 3))
    const byLyricUses = [...songs].sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0))
    return {
      trendingIds: new Set(byEngagement.slice(0, RANK_BADGE_COUNT).map(s => s.id)),
      topIds: new Set(byLyricUses.filter(s => (s.lyricUses || 0) > 0).slice(0, RANK_BADGE_COUNT).map(s => s.id)),
    }
  }, [songs])

  if (songs.length === 0) return null

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader title="Songs" subtitle="New and trending across Margo" viewMoreHref="/music/songs" />
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
// Direct Supabase query, same pattern already used elsewhere on this
// page — no dedicated hook exists for this yet. Song count is left out
// deliberately since the songs↔profiles relationship isn't confirmed.
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
            <Link key={artist.id} href={`/profile/${artist.username || ''}`} style={{ flexShrink: 0, width: '96px', textAlign: 'center', textDecoration: 'none' }}>
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
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Most Shared Lyric Moments row ────────────────────────────────────
// Approximation until a true cross-song lyric-line usage aggregation
// exists: ranks songs by lyricUses and surfaces each one's top shared
// line via useSharedLines. Flagged as a stopgap, not final data logic.
function MostSharedSection({ songs }: { songs: Song[] }) {
  const topSongs = useMemo(
    () => [...songs].filter(s => (s.lyricUses || 0) > 0).sort((a, b) => (b.lyricUses || 0) - (a.lyricUses || 0)).slice(0, 6),
    [songs]
  )
  if (topSongs.length === 0) return null

  return (
    <section style={{ marginBottom: '40px' }}>
      <RowHeader title="Most Shared" subtitle="The lines people keep coming back to" />
      <div className="row-scroll">
        {topSongs.map(song => <MostSharedCard key={song.id} song={song} />)}
      </div>
    </section>
  )
}

function MostSharedCard({ song }: { song: Song }) {
  const { lines } = useSharedLines(song.title, song.artist)
  const top = lines[0]
  if (!top) return null
  return (
    <Link href="/compose" style={{ flexShrink: 0, width: '260px', scrollSnapAlign: 'start', textDecoration: 'none' }}>
      <div style={{ padding: '16px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.15)', borderRadius: '14px', height: '100%', boxSizing: 'border-box' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.55, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          &ldquo;{top.line}&rdquo;
        </p>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
          {top.uses} {top.uses === 1 ? 'use' : 'uses'}
        </p>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          {song.title} · {song.artist}
        </p>
      </div>
    </Link>
  )
}

// ── Song Preview Sheet — unchanged from prior version ───────────────────
function SongPreview({ song, onClose, resonated, onResonate, resonateCount }: {
  song: Song; onClose: () => void; resonated: boolean; onResonate: (id: string) => void; resonateCount: number
}) {
  const { lines } = useSharedLines(song.title, song.artist)
  const { requireAuth } = useAuthGate()
  const isActive = song.status === 'live' || song.status === 'active'
  return (
    <div onClick={onClose} className="margo-preview-scrim" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeInOverlay 250ms ease forwards' }}>
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .play-btn:active { transform: scale(1.04); box-shadow: 0 8px 36px rgba(232,197,71,0.4) !important; }
        .close-btn:active { background: rgba(255,255,255,0.1) !important; }
        @media (hover: hover) and (pointer: fine) {
          .play-btn:hover { transform: scale(1.04); box-shadow: 0 8px 36px rgba(232,197,71,0.4) !important; }
          .close-btn:hover { background: rgba(255,255,255,0.1) !important; }
        }
        @media (min-width: 1024px) { .preview-sheet { border-radius: 20px; max-width: 520px; margin: auto; max-height: 85vh; } .preview-wrap { align-items: center; } }
      `}</style>
      <div className="preview-wrap" onClick={onClose} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div className="preview-sheet" onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(160deg, rgba(28,24,36,0.98) 0%, rgba(14,12,18,0.99) 100%)', border: '1px solid rgba(255,255,255,0.08)', width: '100%', overflowY: 'auto', position: 'relative', animation: 'slideUp 320ms cubic-bezier(0.34,1.56,0.64,1) forwards', borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div style={{ padding: '20px 28px 40px' }}>
            <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms ease', fontFamily: 'var(--font-lora), serif', boxSizing: 'border-box' }}>×</button>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
              {song.artwork && (
                <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px', lineHeight: 1.2 }}>{song.title}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '16px', letterSpacing: '0.5px' }}>{song.artist}</p>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <SmallStatBlock value={song.plays || 0} label="Plays" />
                  <SmallStatBlock value={resonateCount} label="Resonates" />
                  <div style={{ paddingLeft: '20px', borderLeft: '1px solid rgba(232,197,71,0.3)' }}>
                    <SmallStatBlock value={song.lyricUses || 0} label="Lyric Uses" gold />
                  </div>
                </div>
              </div>
            </div>
            {lines[0] && (
              <div style={{ padding: '16px 20px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.15)', borderRadius: '12px', marginBottom: '20px' }}>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.65 }}>&ldquo;{lines[0].line}&rdquo;</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '10px' }}>Most shared line · {lines[0].uses} {lines[0].uses === 1 ? 'use' : 'uses'}</p>
              </div>
            )}
            <button onClick={() => onResonate(song.id)} style={{ width: '100%', padding: '14px', background: resonated ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (resonated ? 'rgba(232,197,71,0.4)' : 'rgba(255,255,255,0.1)'), borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 200ms ease', color: resonated ? 'var(--gold)' : 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
              {resonated ? <><HeartIcon filled size={14} color="currentColor" /> Resonate</> : <><HeartIcon filled={false} size={14} color="currentColor" /> Resonate</>}
            </button>
            {isActive ? (
              <Link
                href={`/music/player?id=${song.id}${song.audioUrl ? '&au=' + encodeURIComponent(song.audioUrl) : ''}`}
                className="play-btn"
                onClick={(e) => { if (!requireAuth()) e.preventDefault() }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px 28px', background: 'var(--gold)', color: 'var(--bg)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', textDecoration: 'none', minHeight: '52px', transition: 'all 200ms ease', boxShadow: '0 6px 28px rgba(232,197,71,0.28)' }}
              ><PlayPauseIcon playing={false} size={14} color="var(--bg)" /> Play Now</Link>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-3)', minHeight: '52px' }}>{song.comingSoonLabel || 'Coming Soon'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Search results ───────────────────────────────────────────────────
// Client-side interim search across song title/artist AND lyric line
// text. This is a stopgap for real Postgres full-text/trigram search
// (flagged in the redesign doc as a separate backend pass) — functional
// now, but should be swapped for a server query once that ships.
function SearchResults({ query, songs, onPreviewSong }: { query: string; songs: Song[]; onPreviewSong: (song: Song) => void }) {
  const q = query.toLowerCase().trim()

  const matchedSongs = useMemo(
    () => songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)),
    [songs, q]
  )

  const matchedLines = useMemo(() => {
    const results: { song: Song; line: string; start: number }[] = []
    songs.forEach(song => {
      song.lyricLines?.forEach(l => {
        if (l.text.toLowerCase().includes(q)) {
          results.push({ song, line: l.text, start: l.startSec })
        }
      })
    })
    return results.slice(0, 20)
  }, [songs, q])

  if (matchedSongs.length === 0 && matchedLines.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem' }}>
          Nothing found for &ldquo;{query}&rdquo;
        </p>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: '32px' }}>
      {matchedLines.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Matching lyrics</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matchedLines.map((m, i) => (
              <Link key={i} href={`/music/player?id=${m.song.id}${m.song.audioUrl ? '&au=' + encodeURIComponent(m.song.audioUrl) : ''}&t=${Math.floor(m.start)}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text)', marginBottom: '6px' }}>&ldquo;{m.line}&rdquo;</p>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>{m.song.title} · {m.song.artist}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {matchedSongs.length > 0 && (
        <section>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Songs & artists</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
            {matchedSongs.map(song => (
              <div key={song.id} style={{ cursor: 'pointer' }} onClick={() => onPreviewSong(song)}>
                <div style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                  {song.artwork ? <Image src={song.artwork} alt={song.title} fill style={{ objectFit: 'cover' }} sizes="140px" /> : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)' }} />}
                </div>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-3)', margin: 0 }}>{song.artist}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function MusicPage() {
  const { songs, loading } = useSongs()
  const { posts } = usePosts()
  const { user } = useIdentity()
  const [preview, setPreview] = useState<Song | null>(null)
  const [search, setSearch] = useState('')

  const [songResonateCounts, setSongResonateCounts] = useState<Record<string, number>>({})
  const [resonatedSongs, setResonatedSongs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (songs.length === 0) return
    // Signed-in: auth.uid()::text for RLS. Unsigned: keep display-name actor
    // (coalesce open path) — out of scope for Batch 5b.
    const myId = user?.id ?? getMargoActorId()

    const counts: Record<string, number> = {}
    songs.forEach(s => { counts[s.id] = s.resonates || 0 })
    setSongResonateCounts(counts)

    supabase
      .from('song_resonates')
      .select('song_id')
      .eq('actor_id', myId)
      .then(({ data, error }) => {
        if (error) { console.error('failed to load resonated songs', error); return }
        setResonatedSongs(new Set((data || []).map(r => r.song_id)))
      })
  }, [songs, user?.id])

  useEffect(() => {
    setSongResonateCounts(prev => {
      const next = { ...prev }
      songs.forEach(s => { next[s.id] = s.resonates || 0 })
      return next
    })
  }, [songs])

  const toggleSongResonate = useCallback(async (songId: string) => {
    const myId = user?.id ?? getMargoActorId()
    const already = resonatedSongs.has(songId)

    setResonatedSongs(prev => {
      const next = new Set(prev)
      already ? next.delete(songId) : next.add(songId)
      return next
    })
    setSongResonateCounts(prev => ({
      ...prev,
      [songId]: Math.max(0, (prev[songId] || 0) + (already ? -1 : 1)),
    }))

    if (already) {
      const { error } = await supabase.from('song_resonates').delete().eq('song_id', songId).eq('actor_id', myId)
      if (error) console.error('failed to remove resonate', error)
    } else {
      const { error } = await supabase.from('song_resonates').insert({ song_id: songId, actor_id: myId })
      if (error) console.error('failed to add resonate', error)
    }
  }, [resonatedSongs, user?.id])

  const isSearching = search.trim().length > 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        .row-scroll {
          display: flex; gap: 12px; overflow-x: auto;
          scroll-snap-type: x proximity; padding-bottom: 4px;
        }
        .vibe-pills-scroll {
          display: flex; gap: 8px; overflow-x: auto;
          -webkit-overflow-scrolling: touch; padding-bottom: 2px;
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
        <SongPreview
          song={preview}
          onClose={() => setPreview(null)}
          resonated={resonatedSongs.has(preview.id)}
          onResonate={toggleSongResonate}
          resonateCount={songResonateCounts[preview.id] || 0}
        />
      )}

      {/* Sticky unified search — the only page-wide sticky element now */}
      <div style={{ position: 'sticky', top: '56px', zIndex: 30, background: 'var(--bg)', padding: 'clamp(20px, 5vw, 40px) 16px 16px' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', position: 'relative' }}>
          <input
            className="music-search"
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search lyrics, songs, artists…"
            style={{
              width: '100%', height: '44px', padding: '0 40px 0 16px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px', color: 'var(--text)', fontFamily: 'var(--font-lora), serif',
              fontSize: '0.82rem', boxSizing: 'border-box', transition: 'border-color 200ms ease',
            }}
          />
          {search && (
            <button aria-label="Clear search" onClick={() => setSearch('')} style={{
              position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
              width: '38px', height: '38px', borderRadius: '50%', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><CloseIcon size={14} color="var(--text-3)" /></button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px 32px', width: '100%', maxWidth: '72rem', margin: '0 auto', boxSizing: 'border-box' }}>
        {isSearching ? (
          <SearchResults query={search} songs={songs} onPreviewSong={setPreview} />
        ) : loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', padding: '8px 0' }}>
            {Array(6).fill(null).map((_, i) => (
              <div key={i} style={{ minHeight: '150px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', animation: `pulse 1.4s ease-in-out ${i * 0.12}s infinite` }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
          </div>
        ) : (
          <>
            <LyricMomentsSection songs={songs} />
            <ResonanceSection posts={posts} />
            <SongsSection songs={songs} onPreview={setPreview} />
            <ArtistsSection />
            <MostSharedSection songs={songs} />
          </>
        )}
      </div>
    </div>
  )
}
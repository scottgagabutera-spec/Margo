'use client'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import {
  CardIcon,
  ChevronRightIcon,
  CloseIcon,
  HeartFilledIcon,
  HeartIcon,
  LyricBackIcon,
  MusicNoteIcon,
  ShareIcon,
} from '@/components/icons'
import { useState, useEffect, useRef, useMemo } from 'react'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/hooks/usePosts'
import { CardExportModal } from '@/components/card-export-modal'
import { EditPostModal } from '@/components/edit-post-modal'
import Link from 'next/link'
import {
  playSnippet,
  stop,
  playFull,
  togglePlayPause,
  setQueue,
  warmUrl,
  subscribeAudioEngine,
} from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { getMargoActorId } from '@/lib/engagement/session'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { UsernameTag } from '@/components/username-tag'
import { useAuthorProfile } from '@/hooks/useAuthorProfile'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'
import { MargoSearchInput } from '@/components/margo-search-input'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { NewItemsPill } from '@/components/new-items-pill'
import { useNewItemsBuffer } from '@/hooks/useNewItemsBuffer'
import { searchProfiles, type ProfileSearchHit } from '@/lib/search-profiles'
import { ArtistBadge } from '@/components/artist-badge'
import { PostThumbnail } from '@/components/post-thumbnail'

const EMOTION_COLORS: Record<string, string> = {
  love: '#FF6B9D', heartbreak: '#ff6060', hope: '#7B9FFF',
  nostalgia: '#E8C547', healing: '#4ade80', joy: '#ffc847',
  rage: '#FF6440', loneliness: '#a0a0ff', sendit: '#00e5c8', letout: '#c864ff',
}

const VIBE_LABELS: Record<string, string> = {
  love: 'Love', heartbreak: 'Heartbreak', hope: 'Hope', nostalgia: 'Nostalgia',
  healing: 'Healing', joy: 'Joy', rage: 'Rage', loneliness: 'Loneliness',
  sendit: 'Send It', letout: 'Let Out',
}

// ── Earned-tag thresholds ────────────────────────────────────────────
// A post only ever shows one of these — never a permanent row of tabs.
// NEW: posted in the last 24h. TRENDING/TOP: in the current top-N by
// score, computed once across the whole unfiltered post list below.
const NEW_WINDOW_HOURS = 24
const RANK_BADGE_COUNT = 5

function normalizeEmotion(e: string) {
  if (!e) return ''
  return e.replace(/send.?it/i, 'SENDIT').replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT').replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT').replace('LET OUT', 'LETOUT')
    .toUpperCase()
}

function timeAgo(ts: number) {
  const diff = (Date.now() - ts) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}

interface LyricLine { id: number; line: string; start: number; end: number }

// ── Migrated Aug 1, 2026 ───────────────────────────────────────────────
async function fetchLyricLines(songId: string): Promise<LyricLine[]> {
  const { data, error } = await supabase
    .from('lyric_lines')
    .select('line_index, text, start_sec, end_sec')
    .eq('song_id', songId)
    .order('line_index', { ascending: true })
  if (error || !data) return []
  return data.map(l => ({ id: l.line_index, line: l.text, start: l.start_sec, end: l.end_sec }))
}

function SnippetIconButton({ audioUrl, songId, postText, songTitle, artist, artwork, snippetStart, snippetEnd }: {
  audioUrl: string; songId: string | null; postText?: string
  songTitle?: string; artist?: string; artwork?: string | null
  snippetStart?: number | null; snippetEnd?: number | null
}) {
  const engineState = useAudioEngine()
  const isThisPlaying = engineState.playing &&
    engineState.mode === 'snippet' &&
    engineState.songId === songId &&
    engineState.snippet?.lineText === (postText || '')

  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const hasExactTiming = snippetStart != null && snippetEnd != null

  useEffect(() => {
    if (songId && !hasExactTiming) {
      fetchLyricLines(songId).then(setLyrics)
    }
  }, [audioUrl, songId, hasExactTiming])

  const toggle = () => {
    if (isThisPlaying) {
      stop()
      return
    }

    let startSec = snippetStart ?? 0
    let endSec = snippetEnd ?? 5
    let lineIndex = 0

    if (!hasExactTiming) {
      const needle = (postText || '').toLowerCase().trim()
      const match = lyrics.find(l =>
        l.line.toLowerCase().includes(needle) || needle.includes(l.line.toLowerCase())
      )
      if (!match) return
      startSec = match.start
      endSec = match.end
      lineIndex = match.id
    }

    void playSnippet({
      songId: songId || audioUrl,
      audioUrl,
      title: songTitle || '',
      artist: artist || '',
      artwork: artwork ?? null,
      lineIndex,
      lineText: postText || '',
      startSec,
      endSec,
      source: 'feed',
    })
  }

  return (
    <button
      onClick={toggle}
      style={{
        width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', flexShrink: 0,
        background: isThisPlaying ? 'rgba(232,197,71,0.2)' : 'rgba(232,197,71,0.1)',
        border: '1px solid rgba(232,197,71,0.25)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 200ms ease', marginTop: '4px',
        padding: 0, boxSizing: 'border-box',
      }}
    >
      <PlayPauseIcon playing={isThisPlaying} size={16} color="var(--gold)" />
    </button>
  )
}

function Tier1Player({ audioUrl, songId, postText }: {
  audioUrl: string; songId: string | null; postText?: string
}) {
  const engineState = useAudioEngine()
  const { requireAuth } = useAuthGate()
  const isThisSong = engineState.songId === (songId || audioUrl)
  const playing = engineState.playing && isThisSong && engineState.mode === 'full'
  const isBuffering = engineState.buffering && isThisSong
  const progress = isThisSong ? engineState.progress : 0
  const currentTime = isThisSong ? engineState.currentTime : 0
  const duration = isThisSong ? engineState.duration : 0

  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [lyricsLoaded, setLyricsLoaded] = useState(false)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const playedRef = useRef(false)

  const loadLyrics = async () => {
    if (lyricsLoaded || !songId) return
    const lines = await fetchLyricLines(songId)
    setLyrics(lines)
    setLyricsLoaded(true)
  }

  const toggle = async () => {
    if (!requireAuth()) return
    loadLyrics()
    if (isThisSong && engineState.mode === 'full') {
      void togglePlayPause()
      return
    }
    stop()
    playedRef.current = true
    void playFull({
      songId: songId || audioUrl,
      audioUrl,
      title: '',
      artist: '',
      artwork: null,
      startSec: 0,
      autoplay: true,
      source: 'feed-tier1',
    })
  }

  const seekFromX = (clientX: number) => {
    const bar = progressRef.current
    if (!bar || !duration || !isThisSong) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    import('@/lib/audio-engine').then(({ playFullSeek }) => playFullSeek(pct * duration))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); setDragging(true); seekFromX(e.clientX)
    const onMove = (ev: MouseEvent) => seekFromX(ev.clientX)
    const onUp = () => { setDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setDragging(true); seekFromX(e.touches[0].clientX)
    const onMove = (ev: TouchEvent) => seekFromX(ev.touches[0].clientX)
    const onEnd = () => { setDragging(false); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
    window.addEventListener('touchmove', onMove); window.addEventListener('touchend', onEnd)
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`
  const currentLine = lyrics.find(l => currentTime >= l.start && currentTime < l.end)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: currentLine ? '12px' : '0' }}>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={toggle}
          style={{
            width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', flexShrink: 0,
            background: 'var(--gold)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: 'none', WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation', userSelect: 'none', boxSizing: 'border-box',
          }}>
          <PlayPauseIcon playing={playing} buffering={isBuffering} size={14} color='var(--bg)' />
        </button>
        <div style={{ flex: 1 }}>
          <div ref={progressRef} className="margo-seek-scrub" onMouseDown={onMouseDown} onTouchStart={onTouchStart}
            style={{ minHeight: 'var(--margo-touch-min)', height: '20px', display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '2px', boxSizing: 'border-box' }}>
            <div style={{ position: 'relative', width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: progress + '%', background: 'var(--gold)', borderRadius: '2px', transition: dragging ? 'none' : 'width 200ms linear' }} />
              <div style={{
                position: 'absolute', top: '50%', left: progress + '%',
                transform: 'translate(-50%, -50%)',
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--gold)', boxShadow: '0 0 4px rgba(232,197,71,0.6)',
                transition: dragging ? 'none' : 'left 200ms linear',
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-3)' }}>{fmt(currentTime)}</span>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-3)' }}>{duration > 0 ? fmt(duration) : '--:--'}</span>
          </div>
        </div>
      </div>

      {playing && (
        <div style={{ minHeight: '32px', padding: '8px 12px', background: 'rgba(232,197,71,0.06)', borderRadius: '8px', borderLeft: '2px solid var(--gold)', transition: 'all 200ms ease' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.82rem', color: currentLine ? 'var(--gold)' : 'var(--text-3)', lineHeight: 1.4, margin: 0, transition: 'color 200ms ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {currentLine ? currentLine.line : <MusicNoteIcon size={14} color="var(--text-3)" />}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Earned tag pill — only rendered when a post actually qualifies ────
function EarnedTag({ label, onClick }: { label: 'New' | 'Trending' | 'Top'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 700,
        letterSpacing: '1.2px', textTransform: 'uppercase', padding: '3px 9px',
        borderRadius: '50px', background: 'rgba(232,197,71,0.1)',
        border: '1px solid var(--gold-border)', color: 'var(--gold)',
        cursor: 'pointer', flexShrink: 0,
      }}
    >{label}</button>
  )
}

function PostCard({
  post, resonated, resonateCount, echoCount, onResonate, onExport,
  isNew, isTrending, isTop, onSelectVibe, onSelectRank,
}: {
  post: Post
  resonated: boolean
  resonateCount: number
  echoCount: number
  onResonate: (id: string) => void
  onExport: (post: Post) => void
  isNew: boolean
  isTrending: boolean
  isTop: boolean
  onSelectVibe: (vibe: string) => void
  onSelectRank: (rank: 'NEW' | 'TRENDING' | 'TOP') => void
}) {
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const authorProfile = useAuthorProfile(post.authorUid || null)
  const viewedRef = useRef(false)
  const emotion = normalizeEmotion(post.emotion || '').toLowerCase()
  const color = EMOTION_COLORS[emotion] || 'var(--text-3)'
  const label = VIBE_LABELS[emotion] || post.emotion || ''
  const isTier1 = !!post.audioUrl
  const audioUrl = post.audioUrl || null
  const cardRef = useRef<HTMLDivElement>(null)
  const isOwner = !!user?.id && !!post.authorUid && post.authorUid === user.id
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!audioUrl || !isTier1) return
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          warmUrl(audioUrl)
          obs.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [audioUrl, isTier1])

  useEffect(() => {
    if (viewedRef.current) return
    const el = cardRef.current
    if (!el) return
    const sessionKey = `viewed_${post.id}`
    try { if (sessionStorage.getItem(sessionKey)) return } catch {}
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          viewedRef.current = true
          obs.disconnect()
          try { sessionStorage.setItem(sessionKey, '1') } catch {}
          supabase.rpc('increment_post_view', { p_post_id: post.id }).then(({ error }) => {
            if (error) console.error('Failed to record view:', error)
          })
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [post.id])

  const avatarUrl = post.authorAvatarUrl || authorProfile?.avatarUrl || null

  return (
    <div ref={cardRef} style={{
      background: isTier1 ? 'rgba(232,197,71,0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isTier1 ? 'rgba(232,197,71,0.22)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '18px', padding: '16px',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 200ms ease',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '60%', height: '1px',
        background: isTier1
          ? 'linear-gradient(to right, transparent, rgba(232,197,71,0.5), transparent)'
          : 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: avatarUrl
              ? 'none'
              : isTier1 ? 'var(--gold)' : 'linear-gradient(135deg, rgba(232,197,71,0.3), rgba(232,197,71,0.1))',
            border: avatarUrl
              ? '1px solid rgba(255,255,255,0.08)'
              : isTier1 ? 'none' : '1px solid rgba(232,197,71,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={post.username || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : isTier1 ? (
              <svg width='26' height='26' viewBox='-4 -4 88 88' xmlns='http://www.w3.org/2000/svg'>
                <path d='M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57'
                  fill='none' stroke='var(--bg)' strokeWidth='7' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
            ) : (
              <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.65rem', fontWeight: 700, color: 'var(--gold)' }}>
                {post.username ? post.username.charAt(0).toUpperCase() : 'ML'}
              </span>
            )}
          </div>
          <div>
            <UsernameTag authorUid={post.authorUid || null} fallbackName={post.username} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(isNew || isTrending || isTop) && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {isNew && <EarnedTag label="New" onClick={() => onSelectRank('NEW')} />}
              {isTrending && <EarnedTag label="Trending" onClick={() => onSelectRank('TRENDING')} />}
              {isTop && <EarnedTag label="Top" onClick={() => onSelectRank('TOP')} />}
            </div>
          )}
          {isOwner && (
            <button
              type="button"
              aria-label="Edit lyric"
              onClick={() => setEditOpen(true)}
              style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-3)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isOwner && (
        <EditPostModal
          open={editOpen}
          onOpenChange={setEditOpen}
          postId={post.id}
          initialText={post.text || ''}
          songId={post.songId || null}
          echoCount={echoCount}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <p style={{
          fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
          fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)', color: 'var(--text)',
          lineHeight: 1.45, flex: 1, margin: 0,
        }}>
          &ldquo;{post.text}&rdquo;
        </p>
        {isTier1 && audioUrl && (
          <SnippetIconButton audioUrl={audioUrl} songId={post.songId || null} postText={post.text} songTitle={post.knowledge?.song || ''} artist={post.knowledge?.artist || ''} artwork={post.knowledge?.artwork || null} snippetStart={post.snippetStart} snippetEnd={post.snippetEnd} />
        )}
      </div>

      {(post.knowledge?.song || post.knowledge?.artist) && (() => {
        const attribution = post.knowledge.song && post.knowledge.artist
          ? `${post.knowledge.song} · ${post.knowledge.artist}`
          : (post.knowledge.song || post.knowledge.artist || '')
        const attrStyle: React.CSSProperties = {
          fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
          color: 'rgba(255,255,255,0.75)', letterSpacing: '1px', textTransform: 'uppercase',
          marginBottom: '20px',
        }
        // Linked Margo catalog posts deep-link to karaoke; external
        // attribution stays plain text (outbound art/YouTube links elsewhere).
        if (post.songId) {
          return (
            <Link href={`/song/${post.songId}`} style={{ ...attrStyle, display: 'block', textDecoration: 'none' }}>
              {attribution}
            </Link>
          )
        }
        return <p style={attrStyle}>{attribution}</p>
      })()}

      {!isTier1 && (post.youtubeMeta?.thumbnail || post.knowledge?.artwork) && (
        <Link
          href={post.youtubeMeta?.youtubeUrl || `https://music.apple.com/search?term=${encodeURIComponent((post.knowledge?.song || '') + ' ' + (post.knowledge?.artist || ''))}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={post.youtubeMeta?.youtubeUrl ? 'Watch on YouTube' : 'Open in Apple Music'}
          style={{ display: 'block', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', textDecoration: 'none' }}
        >
          <div style={{ position: 'relative' }}>
            <PostThumbnail
              youtubeThumbnail={post.youtubeMeta?.thumbnail}
              artwork={post.knowledge?.artwork}
              alt=""
              style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShareIcon size={16} color="var(--bg)" />
              </div>
            </div>
          </div>
        </Link>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          aria-label={resonated ? 'Remove resonate' : 'Resonate'}
          onClick={() => onResonate(post.id)}
          style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
          minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
          color: resonated ? 'var(--gold)' : 'var(--text-secondary)',
          transition: 'color 150ms ease',
        }}>
          {resonated
            ? <HeartFilledIcon size={18} color="var(--gold)" />
            : <HeartIcon size={18} color="var(--text-secondary)" />
          }
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            {resonateCount > 0 ? resonateCount + ' ' : ''}Resonate
          </span>
        </button>

        <Link
          href={`/lyric-back?postId=${post.id}`}
          aria-label="Lyric Back"
          style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px 12px',
          minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
          transition: 'color 150ms ease',
        }}>
          <LyricBackIcon size={18} color="var(--text-secondary)" />
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{echoCount > 0 ? echoCount + ' ' : ''}Lyric Back</span>
        </Link>

        <button
          type="button"
          aria-label="Export lyric card"
          onClick={() => onExport(post)}
          style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
          minWidth: '44px', minHeight: '44px', boxSizing: 'border-box',
          color: 'var(--text-secondary)', transition: 'color 150ms ease',
        }}>
          <CardIcon size={18} color="var(--text-secondary)" />
          <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Card</span>
        </button>

        {label && (
          <button
            type="button"
            onClick={() => onSelectVibe(emotion.toUpperCase())}
            style={{
              fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
              letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
              borderRadius: '50px', background: 'rgba(255,255,255,0.04)',
              border: 'none', cursor: 'pointer', color,
            }}
          >{label}</button>
        )}
      </div>

      {isTier1 && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(232,197,71,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              {audioUrl && <Tier1Player audioUrl={audioUrl} songId={post.songId || null} postText={post.text} />}
            </div>
            {post.songId && (
              <Link
                href={`/song/${post.songId}`}
                aria-label="Full Karaoke"
                onClick={(e) => { if (!requireAuth()) e.preventDefault() }}
                style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                minHeight: 'var(--margo-touch-min)', boxSizing: 'border-box',
                fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
                color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase',
                textDecoration: 'none', padding: '0 14px', border: '1px solid var(--gold-border)',
                borderRadius: '50px', flexShrink: 0, alignSelf: 'flex-start',
              }}>
                Full Karaoke
                <ChevronRightIcon size={12} color="var(--gold)" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const { posts: livePosts, loading, reload } = usePosts()
  const {
    items: posts,
    pendingCount,
    flushPending,
    applyImmediate,
  } = useNewItemsBuffer(livePosts)
  const [ptrBusy, setPtrBusy] = useState(false)
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const [selectedVibe, setSelectedVibe] = useState('ALL')
  const [selectedSort, setSelectedSort] = useState('NEW')
  const [searchQuery, setSearchQuery] = useState('')
  const [people, setPeople] = useState<ProfileSearchHit[]>([])
  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const [postStats, setPostStats] = useState<Record<string, { views?: number; resonateCount?: number; echoCount?: number }>>({})
  const [exportPost, setExportPost] = useState<Post | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      const { data, error } = await supabase
        .from('post_stats')
        .select('post_id, views, resonate_count, echo_count')
      if (cancelled) return
      if (error) { console.error('Failed to load post_stats:', error); return }
      const map: Record<string, { views?: number; resonateCount?: number; echoCount?: number }> = {}
      for (const row of data || []) {
        map[row.post_id] = { views: row.views, resonateCount: row.resonate_count, echoCount: row.echo_count }
      }
      setPostStats(map)
    }
    loadStats()

    const channel = supabase
      .channel('feed-post-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_stats' }, () => loadStats())
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const myId = getMargoActorId()
    let cancelled = false
    async function loadMyResonates() {
      const { data, error } = await supabase
        .from('post_resonates')
        .select('post_id')
        .eq('actor_id', myId)
      if (cancelled) return
      if (error) { console.error('Failed to load resonates:', error); return }
      const mine = new Set((data || []).map(r => r.post_id))
      setResonated(mine)
      try { localStorage.setItem('margoResonated', JSON.stringify([...mine])) } catch {}
    }
    loadMyResonates()

    const channel = supabase
      .channel('feed-my-resonates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_resonates', filter: `actor_id=eq.${myId}` },
        () => loadMyResonates()
      )
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [])

  const getEngagement = (post: Post) => {
    const s = postStats[post.id] || {}
    return (s.views || 0) + ((s.resonateCount || 0) * 4) + ((s.echoCount || 0) * 5)
  }

  const getAge = (post: Post) => {
    if (!post.timestamp) return 999
    return (Date.now() - post.timestamp) / 3600000
  }

  // Refactored to take the sort mode as an argument (was reading
  // selectedSort from closure) so we can score every post under every
  // mode once, up front, to compute which posts EARN a badge — instead
  // of only ever knowing scores under whichever single sort was active.
  const getScoreFor = (post: Post, sort: string) => {
    const age = getAge(post)
    const engage = getEngagement(post)
    if (sort === 'NEW') return Math.exp(-age / 18) * 1000 + engage * 0.05
    if (sort === 'TRENDING') return engage / Math.pow(age + 2, 1.4)
    if (sort === 'TOP') return engage
    return 0
  }

  // Earned-badge sets — computed once from the full unfiltered post
  // list, independent of whatever filter is currently active. A badge
  // is never permanent chrome; it only exists on posts that actually
  // rank in the top N right now.
  const { newIds, trendingIds, topIds } = useMemo(() => {
    const newIds = new Set(posts.filter(p => getAge(p) < NEW_WINDOW_HOURS).map(p => p.id))
    const trendingIds = new Set(
      [...posts]
        .sort((a, b) => getScoreFor(b, 'TRENDING') - getScoreFor(a, 'TRENDING'))
        .slice(0, RANK_BADGE_COUNT)
        .map(p => p.id)
    )
    const topIds = new Set(
      [...posts]
        .sort((a, b) => getScoreFor(b, 'TOP') - getScoreFor(a, 'TOP'))
        .slice(0, RANK_BADGE_COUNT)
        .map(p => p.id)
    )
    return { newIds, trendingIds, topIds }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, postStats])


  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) { setPeople([]); return }
    const t = setTimeout(async () => {
      const hits = await searchProfiles(supabase, q)
      setPeople(hits)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const filteredPosts = posts
    .filter(p => {
      const norm = normalizeEmotion(p.emotion || '')
      const matchesVibe = selectedVibe === 'ALL' || norm === selectedVibe
      if (!searchQuery.trim()) return matchesVibe
      const q = searchQuery.toLowerCase()
      return matchesVibe && (
        (p.text || '').toLowerCase().includes(q) ||
        (p.knowledge?.song || '').toLowerCase().includes(q) ||
        (p.knowledge?.artist || '').toLowerCase().includes(q) ||
        (p.emotion || '').toLowerCase().includes(q) ||
        (p.username || '').toLowerCase().includes(q) ||
        (p.authorDisplayName || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => getScoreFor(b, selectedSort) - getScoreFor(a, selectedSort))

  const notifyResonate = async (post: Post) => {
    if (!user?.id) return
    if (!post.authorUid || post.authorUid === user.id) return
    try {
      const { error } = await supabase.from('notifications').insert({
        recipient_id: post.authorUid,
        actor_id: user.id,
        type: 'resonate',
        post_id: post.id,
      })
      if (error) console.error('Failed to insert resonate notification:', error)
    } catch (err) {
      console.error('Failed to insert resonate notification:', err)
    }
  }

  const toggleResonate = async (postId: string) => {
    if (!requireAuth()) return
    const already = resonated.has(postId)
    const myId = getMargoActorId()
    setResonated(prev => {
      const next = new Set(prev)
      already ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem('margoResonated', JSON.stringify([...next])) } catch {}
      return next
    })
    setResonateCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (already ? -1 : 1)) }))

    try {
      if (already) {
        const { error } = await supabase.from('post_resonates').delete().eq('post_id', postId).eq('actor_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_resonates').insert({ post_id: postId, actor_id: myId })
        if (error) throw error
      }
      if (!already) {
        const post = posts.find(p => p.id === postId)
        if (post) void notifyResonate(post)
      }
    } catch {
      setResonated(prev => {
        const next = new Set(prev)
        already ? next.add(postId) : next.delete(postId)
        return next
      })
      setResonateCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (already ? 1 : -1)) }))
    }
  }

  const handleExport = (post: Post) => {
    if (!requireAuth()) return
    setExportPost(post)
  }

  const handleSelectVibe = (vibe: string) => {
    setSelectedVibe(prev => (prev === vibe ? 'ALL' : vibe))
  }

  const handleSelectRank = (rank: 'NEW' | 'TRENDING' | 'TOP') => {
    setSelectedSort(prev => (prev === rank ? 'NEW' : rank))
  }

  const hasActiveFilter = selectedVibe !== 'ALL' || selectedSort !== 'NEW'

  return (
    <PullToRefresh
      onRefreshingChange={setPtrBusy}
      onRefresh={async () => {
        const latest = await reload()
        applyImmediate(latest)
      }}
    >
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', paddingTop: 'var(--nav-height, 72px)' }}>
      {!ptrBusy && pendingCount > 0 && (
        <NewItemsPill count={pendingCount} onReveal={flushPending} noun="new lyrics" />
      )}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-128px', left: '-128px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-160px', right: '-160px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      {/* Sticky header — search only now. The old permanent vibe-pill row
          and New/Trending/Top tab row are gone; those filters are now
          triggered from tags that live ON the posts themselves (see
          EarnedTag and the vibe label button in PostCard), and only
          show up here as a dismissible chip once one is active.

          top: var(--nav-height) — was a hardcoded 56px guess, which
          undershot the real fixed-nav height and let this sticky bar
          (and by extension the feed content below it) drift under the
          nav. Now reads the same measured value MargoNav publishes,
          so this can't drift out of sync again. */}
      <div style={{ position: 'sticky', top: 'var(--nav-height, 72px)', zIndex: 30, background: 'var(--bg)', padding: 'clamp(20px, 5vw, 56px) 20px 0' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ paddingBottom: hasActiveFilter ? '10px' : '20px' }}>
            <MargoSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search lyrics, songs, artists, people…"
            />
          </div>

          {hasActiveFilter && (
            <div style={{ display: 'flex', gap: '6px', paddingBottom: '16px' }}>
              {selectedVibe !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedVibe('ALL')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '50px',
                    background: 'var(--gold)', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--bg)',
                  }}
                >Filtering: {selectedVibe} <CloseIcon size={10} color="var(--bg)" /></button>
              )}
              {selectedSort !== 'NEW' && (
                <button
                  type="button"
                  onClick={() => setSelectedSort('NEW')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '50px',
                    background: 'transparent', border: '1px solid var(--gold-border)', cursor: 'pointer',
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)',
                  }}
                >{selectedSort} <CloseIcon size={10} color="var(--gold)" /></button>
              )}
            </div>
          )}
        </div>
      </div>

      <main style={{ position: 'relative', zIndex: 5, maxWidth: '720px', margin: '0 auto', padding: '32px 24px var(--margo-page-padding-bottom)' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '64px 0' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.5 }} />
            ))}
          </div>
        )}

        {!loading && filteredPosts.length === 0 && !(searchQuery.trim() && people.length > 0) && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '1rem', marginBottom: '16px' }}>
              {searchQuery ? `No lyrics found for "${searchQuery}"` : `No ${selectedVibe === 'ALL' ? '' : selectedVibe.toLowerCase()} lyrics yet`}
            </p>
            <Link href="/compose" style={{
              padding: '10px 24px', border: '1px solid var(--border)',
              borderRadius: '50px', color: 'var(--text-3)',
              fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
              letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none',
            }}>Be the first</Link>
          </div>
        )}


        {searchQuery.trim() && people.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>People</p>
            {people.map(p => (
              <Link key={p.id} href={`/profile/${p.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', textDecoration: 'none', borderBottom: '1px solid var(--border)', minHeight: 'var(--margo-touch-min)' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: p.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--bg)' }}>
                      {(p.displayName || p.username || '??').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--text)', fontFamily: 'var(--font-lora), serif', fontSize: '0.9rem', margin: 0 }}>{p.displayName}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>@{p.username}</p>
                </div>
                {p.isArtist && <ArtistBadge isArtist artistStatus={p.artistStatus} size={12} />}
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              resonated={resonated.has(post.id)}
              resonateCount={postStats[post.id]?.resonateCount ?? resonateCounts[post.id] ?? post.resonates ?? 0}
              echoCount={postStats[post.id]?.echoCount ?? 0}
              onResonate={toggleResonate}
              onExport={handleExport}
              isNew={newIds.has(post.id)}
              isTrending={trendingIds.has(post.id)}
              isTop={topIds.has(post.id)}
              onSelectVibe={handleSelectVibe}
              onSelectRank={handleSelectRank}
            />
          ))}
        </div>

        {!loading && filteredPosts.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <div style={{ height: '1px', width: '96px', background: 'linear-gradient(to right, transparent, var(--border), transparent)', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text-3)' }}>you&apos;ve felt them all</p>
          </div>
        )}
      </main>

      <CardExportModal
        open={!!exportPost}
        onOpenChange={(o) => { if (!o) setExportPost(null) }}
        lyric={exportPost?.text || ''}
        song={exportPost?.knowledge?.song || ''}
        artist={exportPost?.knowledge?.artist || ''}
        postId={exportPost?.id}
      />
    </div>
    </PullToRefresh>
  )
}
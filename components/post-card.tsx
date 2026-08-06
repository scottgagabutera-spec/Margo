'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import {
  CardIcon,
  ChevronRightIcon,
  HeartFilledIcon,
  HeartIcon,
  LyricBackIcon,
  MoreIcon,
  MusicNoteIcon,
  ReplayIcon,
  ShareIcon,
} from '@/components/icons'
import type { Post } from '@/hooks/usePosts'
import { EditPostModal } from '@/components/edit-post-modal'
import {
  playSnippet,
  stop,
  playFull,
  togglePlayPause,
  warmUrl,
} from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { UsernameTag } from '@/components/username-tag'
import { useAuthorProfile } from '@/hooks/useAuthorProfile'
import { supabase } from '@/lib/supabase'
import { useIdentity } from '@/hooks/useIdentity'
import { PostThumbnail } from '@/components/post-thumbnail'

export type PostCardVariant = 'feed' | 'compact' | 'row'

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Other'] as const

export interface PostCardProps {
  post: Post
  resonated: boolean
  resonateCount: number
  echoCount: number
  onResonate: (id: string) => void
  onExport: (post: Post) => void
  /** feed-only ranking badges; ignored when variant is compact */
  isNew?: boolean
  isTrending?: boolean
  isTop?: boolean
  onSelectVibe?: (vibe: string) => void
  onSelectRank?: (rank: 'NEW' | 'TRENDING' | 'TOP') => void
  variant?: PostCardVariant
  replayed?: boolean
  replayCount?: number
  onReplay?: (id: string) => void
  onQuoteReplay?: (id: string, quoteText: string) => void
}

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

export function normalizeEmotion(e: string) {
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
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-muted)' }}>{fmt(currentTime)}</span>
            <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', color: 'var(--text-muted)' }}>{duration > 0 ? fmt(duration) : '--:--'}</span>
          </div>
        </div>
      </div>

      {playing && (
        <div style={{ minHeight: '32px', padding: '8px 12px', background: 'rgba(232,197,71,0.06)', borderRadius: '8px', borderLeft: '2px solid var(--gold)', transition: 'all 200ms ease' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.82rem', color: currentLine ? 'var(--gold)' : 'var(--text-muted)', lineHeight: 1.4, margin: 0, transition: 'color 200ms ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {currentLine ? currentLine.line : <MusicNoteIcon size={14} color="var(--text-muted)" />}
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

export function PostCard({
  post, resonated, resonateCount, echoCount, onResonate, onExport,
  isNew = false, isTrending = false, isTop = false, onSelectVibe, onSelectRank,
  variant = 'feed',
  replayed = false, replayCount = 0, onReplay, onQuoteReplay,
}: PostCardProps) {
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const authorProfile = useAuthorProfile(post.authorUid || null)
  const viewedRef = useRef(false)
  const emotion = normalizeEmotion(post.emotion || '').toLowerCase()
  const color = EMOTION_COLORS[emotion] || 'var(--text-disabled)'
  const label = VIBE_LABELS[emotion] || post.emotion || ''
  const isTier1 = !!post.audioUrl
  const audioUrl = post.audioUrl || null
  const cardRef = useRef<HTMLDivElement>(null)
  const isOwner = !!user?.id && !!post.authorUid && post.authorUid === user.id
  const [editOpen, setEditOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportMsg, setReportMsg] = useState<string | null>(null)
  const [hideBusy, setHideBusy] = useState(false)
  const [hiddenLocally, setHiddenLocally] = useState(false)
  const [replayMenuOpen, setReplayMenuOpen] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [rowExpanded, setRowExpanded] = useState(false)
  const [avatarBroken, setAvatarBroken] = useState(false)
  useEffect(() => { setAvatarBroken(false) }, [post.authorAvatarUrl, post.authorUid])
  // row collapses to a dense one-liner; expand renders the compact card in place
  const isRow = variant === 'row'
  const isCompact = variant === 'compact' || (isRow && rowExpanded)
  const avatarPx = isCompact ? '32px' : '40px'
  const cardPadding = isCompact ? '12px' : '16px'

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

  const rawAvatarUrl = (post.authorAvatarUrl || authorProfile?.avatarUrl || '').trim()
  const avatarUrl = rawAvatarUrl && !avatarBroken ? rawAvatarUrl : null

  if (hiddenLocally && isCompact) {
    return (
      <div style={{
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: cardPadding,
        fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.85rem',
        color: 'var(--text-muted)', textAlign: 'center',
      }}>
        Reply hidden.
      </div>
    )
  }

  if (isRow && !rowExpanded) {
    const songLine = [post.knowledge?.song, post.knowledge?.artist].filter(Boolean).join(' · ')
    return (
      <button
        type="button"
        onClick={() => setRowExpanded(true)}
        aria-label="Expand lyric"
        style={{
          display: 'block', width: '100%', textAlign: 'left', boxSizing: 'border-box',
          background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
          padding: '12px 4px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          minHeight: 'var(--margo-touch-min)',
        }}
      >
        <p style={{
          margin: 0, fontFamily: 'var(--font-lora), serif', fontSize: '0.95rem',
          color: 'var(--text)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {post.text || 'Untitled lyric'}
        </p>
        {songLine ? (
          <p style={{
            margin: '4px 0 0', fontFamily: 'var(--font-lora), serif', fontSize: '0.72rem',
            color: 'var(--text-muted)', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {songLine}
          </p>
        ) : null}
      </button>
    )
  }

  return (
    <div ref={cardRef} style={{
      background: isTier1 ? 'rgba(232,197,71,0.04)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isTier1 ? 'rgba(232,197,71,0.22)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '18px', padding: cardPadding,
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 200ms ease',
    }}>
      {isRow && (
        <button
          type="button"
          onClick={() => setRowExpanded(false)}
          aria-label="Collapse lyric"
          style={{
            position: 'absolute', top: '8px', right: '8px', zIndex: 2,
            width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 0, WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}>
            <ChevronRightIcon size={14} color="var(--text-muted)" />
          </span>
        </button>
      )}
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
            width: avatarPx, height: avatarPx, borderRadius: '50%', flexShrink: 0,
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
              <img src={avatarUrl} alt={post.username || 'avatar'} onError={() => setAvatarBroken(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{
                fontFamily: 'var(--font-lora), serif',
                fontSize: isCompact ? '0.6rem' : '0.7rem',
                fontWeight: 700,
                color: isTier1 ? 'var(--bg)' : 'var(--gold)',
              }}>
                {post.username ? post.username.charAt(0).toUpperCase() : (isTier1 ? 'M' : 'ML')}
              </span>
            )}
          </div>
          <div>
            <UsernameTag authorUid={post.authorUid || null} fallbackName={post.username} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {variant === 'feed' && (isNew || isTrending || isTop) && (
            <div style={{ display: 'flex', gap: '6px' }}>
              {isNew && <EarnedTag label="New" onClick={() => onSelectRank?.('NEW')} />}
              {isTrending && <EarnedTag label="Trending" onClick={() => onSelectRank?.('TRENDING')} />}
              {isTop && <EarnedTag label="Top" onClick={() => onSelectRank?.('TOP')} />}
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
                color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
          {!hiddenLocally && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="More actions"
                aria-expanded={menuOpen}
                onClick={() => { setMenuOpen(o => !o); setReportOpen(false); setReportMsg(null) }}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box',
                }}
              >
                <MoreIcon size={16} color="var(--text-secondary)" />
              </button>
              {menuOpen && !reportOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '6px', zIndex: 20,
                    minWidth: '160px', background: 'var(--bg)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                    padding: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                  }}
                >
                  {!isOwner && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (!requireAuth()) return
                        setReportOpen(true)
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '12px 14px', minHeight: '44px', background: 'none', border: 'none',
                        color: 'var(--text)', fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
                        cursor: 'pointer', borderRadius: '8px',
                      }}
                    >Report</button>
                  )}
                  {isOwner && isCompact && (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={hideBusy}
                      onClick={async () => {
                        if (!requireAuth() || hideBusy) return
                        setHideBusy(true)
                        const { error } = await supabase
                          .from('posts')
                          .update({ status: 'hidden' })
                          .eq('id', post.id)
                        setHideBusy(false)
                        if (error) {
                          setReportMsg(error.message)
                          return
                        }
                        setHiddenLocally(true)
                        setMenuOpen(false)
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '12px 14px', minHeight: '44px', background: 'none', border: 'none',
                        color: 'var(--text)', fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
                        cursor: hideBusy ? 'not-allowed' : 'pointer', borderRadius: '8px',
                      }}
                    >{hideBusy ? 'Hiding…' : 'Hide reply'}</button>
                  )}
                  {isOwner && !isCompact && (
                    <p style={{
                      margin: 0, padding: '10px 14px', fontFamily: 'var(--font-lora), serif',
                      fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic',
                    }}>Use edit to change this lyric.</p>
                  )}
                  {reportMsg && (
                    <p style={{
                      margin: '6px 4px 0', fontFamily: 'var(--font-lora), serif',
                      fontSize: '0.72rem', color: '#ff6060',
                    }}>{reportMsg}</p>
                  )}
                </div>
              )}
              {menuOpen && reportOpen && (
                <div
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '6px', zIndex: 20,
                    minWidth: '200px', background: 'var(--bg)',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                    padding: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                  }}
                >
                  <p style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)',
                    margin: '0 0 8px',
                  }}>Why report?</p>
                  {REPORT_REASONS.map(reason => (
                    <button
                      key={reason}
                      type="button"
                      disabled={reportBusy}
                      onClick={async () => {
                        if (!user?.id || reportBusy) return
                        setReportBusy(true)
                        setReportMsg(null)
                        const { error } = await supabase.from('post_reports').insert({
                          post_id: post.id,
                          reporter_id: user.id,
                          reason,
                        })
                        setReportBusy(false)
                        if (error) {
                          const msg = String(error.message || '')
                          setReportMsg(msg.toLowerCase().includes('duplicate') || msg.includes('unique')
                            ? 'Already reported.'
                            : error.message)
                          return
                        }
                        setReportMsg('Thanks — we received your report.')
                        setTimeout(() => { setMenuOpen(false); setReportOpen(false); setReportMsg(null) }, 1200)
                      }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 12px', minHeight: '44px', background: 'none', border: 'none',
                        color: 'var(--text)', fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
                        cursor: reportBusy ? 'not-allowed' : 'pointer', borderRadius: '8px',
                      }}
                    >{reason}</button>
                  ))}
                  {reportMsg && (
                    <p style={{
                      margin: '6px 4px 0', fontFamily: 'var(--font-lora), serif',
                      fontSize: '0.72rem', color: 'var(--gold)',
                    }}>{reportMsg}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => { setReportOpen(false); setReportMsg(null) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 12px', minHeight: '44px', background: 'none', border: 'none',
                      color: 'var(--text-muted)', fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >Back</button>
                </div>
              )}
            </div>
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
          fontSize: isCompact ? '1rem' : 'clamp(1.1rem, 2.4vw, 1.5rem)', color: 'var(--text)',
          lineHeight: 1.45, flex: 1, margin: 0,
        }}>
          &ldquo;{post.text}&rdquo;
        </p>
        {isCompact && (post.knowledge?.artwork || post.youtubeMeta?.thumbnail) && (
          <PostThumbnail
            youtubeThumbnail={post.youtubeMeta?.thumbnail}
            artwork={post.knowledge?.artwork}
            alt=""
            style={{
              width: '56px', height: '56px', borderRadius: '8px',
              objectFit: 'cover', flexShrink: 0,
              border: '1px solid var(--border)',
            }}
          />
        )}
        {!isCompact && isTier1 && audioUrl && (
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

      <div>
      <div className="margo-feed-actions">
        <button
          type="button"
          className="margo-feed-action"
          aria-label={resonated ? 'Remove resonate' : 'Resonate'}
          onClick={() => onResonate(post.id)}
          style={{
            color: resonated ? 'var(--gold)' : 'var(--text-secondary)',
            transition: 'color 150ms ease',
          }}
        >
          {resonated
            ? <HeartFilledIcon size={18} color="var(--gold)" />
            : <HeartIcon size={18} color="var(--text-secondary)" />
          }
          {resonateCount > 0 ? (
            <span className="margo-feed-action__count">{resonateCount}</span>
          ) : null}
          <span className="margo-feed-action__label">Resonate</span>
        </button>

        <Link
          href={`/lyric-back?postId=${post.id}`}
          className="margo-feed-action"
          aria-label="Lyric Back"
          style={{
            color: 'var(--text-secondary)',
            transition: 'color 150ms ease',
          }}
        >
          <LyricBackIcon size={18} color="var(--text-secondary)" />
          {echoCount > 0 ? (
            <span className="margo-feed-action__count">{echoCount}</span>
          ) : null}
          <span className="margo-feed-action__label">Lyric Back</span>
        </Link>

        <button
          type="button"
          className="margo-feed-action"
          aria-label="Export lyric card"
          onClick={() => onExport(post)}
          style={{
            color: 'var(--text-secondary)', transition: 'color 150ms ease',
          }}
        >
          <CardIcon size={18} color="var(--text-secondary)" />
          <span className="margo-feed-action__label">Card</span>
        </button>

        <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
          <button
            type="button"
            className="margo-feed-action"
            aria-label={replayed ? 'Undo Replay' : 'Replay'}
            aria-expanded={replayMenuOpen}
            onClick={() => {
              setReplayMenuOpen(o => !o)
              setQuoteOpen(false)
              setQuoteText('')
            }}
            style={{
              width: '100%',
              color: replayed ? 'var(--gold)' : 'var(--text-secondary)',
              transition: 'color 150ms ease',
            }}
          >
            <ReplayIcon size={18} color={replayed ? 'var(--gold)' : 'var(--text-secondary)'} />
            {replayCount > 0 ? (
              <span className="margo-feed-action__count">{replayCount}</span>
            ) : null}
            <span className="margo-feed-action__label">Replay</span>
          </button>
          {replayMenuOpen && !quoteOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px', zIndex: 20,
                minWidth: '160px', background: 'var(--bg)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                padding: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (!requireAuth()) return
                  onReplay?.(post.id)
                  setReplayMenuOpen(false)
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 14px', minHeight: '44px', background: 'none', border: 'none',
                  color: 'var(--text)', fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
                  cursor: 'pointer', borderRadius: '8px',
                }}
              >{replayed ? 'Undo Replay' : 'Replay'}</button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (!requireAuth()) return
                  setQuoteOpen(true)
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 14px', minHeight: '44px', background: 'none', border: 'none',
                  color: 'var(--text)', fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
                  cursor: 'pointer', borderRadius: '8px',
                }}
              >Add your take</button>
            </div>
          )}
          {replayMenuOpen && quoteOpen && (
            <div
              style={{
                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px', zIndex: 20,
                width: '220px', background: 'var(--bg)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                padding: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Add your take…"
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'vertical',
                  fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem',
                  color: 'var(--text)', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                  padding: '10px', outline: 'none', marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const text = quoteText.trim()
                    if (!text) return
                    if (!requireAuth()) return
                    onQuoteReplay?.(post.id, text)
                    setReplayMenuOpen(false)
                    setQuoteOpen(false)
                    setQuoteText('')
                  }}
                  style={{
                    flex: 1, minHeight: '44px', padding: '0 12px',
                    background: 'var(--gold)', border: 'none', borderRadius: '8px',
                    color: 'var(--bg)', fontFamily: 'var(--font-lora), serif',
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px',
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >Submit</button>
                <button
                  type="button"
                  onClick={() => {
                    setQuoteOpen(false)
                    setQuoteText('')
                    setReplayMenuOpen(false)
                  }}
                  style={{
                    flex: 1, minHeight: '44px', padding: '0 12px',
                    background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-lora), serif',
                    fontSize: '0.75rem', cursor: 'pointer',
                  }}
                >Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

        {label && (
          <button
            type="button"
            onClick={() => onSelectVibe?.(emotion.toUpperCase())}
            style={{
              fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem', fontWeight: 700,
              letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 10px',
              borderRadius: '50px', background: 'rgba(255,255,255,0.04)',
              border: 'none', cursor: 'pointer', color, flexShrink: 0,
              marginTop: '8px',
            }}
          >{label}</button>
        )}
      </div>

      {isTier1 && !isCompact && (
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(232,197,71,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              {audioUrl && <Tier1Player audioUrl={audioUrl} songId={post.songId || null} postText={post.text} />}
            </div>
            {variant === 'feed' && post.songId && (
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

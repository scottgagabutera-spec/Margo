'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  togglePlayPause,
  seekSnippetProgress,
  playFullSeek,
  toggleMute,
  setVolume,
  queuePrev,
  queueNext,
  stop,
} from '@/lib/audio-engine'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { MusicNoteIcon } from '@/components/icons'
import { SessionQueueList } from '@/components/session-queue-list'
import { MiniPlayerFeedChrome } from '@/components/mini-player-feed-chrome'
import { useAudioEngine, useQueueNavigation, usePlaybackProgress } from '@/hooks/useAudioEngine'

const VIBE_COLORS: Record<string, string> = {
  love: '#FF6B9D', heartbreak: '#ff6060', hope: '#7B9FFF',
  nostalgia: '#E8C547', healing: '#4ade80', joy: '#ffc847',
  rage: '#FF6440', loneliness: '#a0a0ff', sendit: '#00e5c8',
  letout: '#c864ff', chill: '#60b8ff', grateful: '#a0e080',
  spiritual: '#c8a0ff', proud: '#FFB347',
}

// Drag-to-dismiss tuning — a slow partial drag snaps back, a fast flick
// or a drag past DISMISS_DISTANCE dismisses regardless of how far it went.
const DISMISS_DISTANCE = 44 // px
const DISMISS_VELOCITY = 0.5 // px/ms

export function MiniPlayer() {
  const pathname = usePathname()
  const engineState = useAudioEngine()
  const { canPrev, canNext } = useQueueNavigation()
  const progress = usePlaybackProgress()
  const [expanded, setExpanded] = useState(false)
  /** Feed collapsed level — pill default, orb after swipe-down (A.3). */
  const [feedChrome, setFeedChrome] = useState<'pill' | 'orb'>('pill')
  const [dragging, setDragging] = useState(false)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef(0)

  const { playing, buffering, muted, volume, currentTime, duration, mode, songId, title, artist, artwork, vibe, snippet, queue, queueIndex } = engineState

  // Collapse = hide chrome / sheet, keep audio + queue (A.3 pill/orb).
  // Close / dismiss = end session: stop + clear queue (A5). Do not conflate.
  const endSession = useCallback(() => {
    setExpanded(false)
    setFeedChrome('pill')
    stop({ clearQueue: true })
  }, [])

  const isOnFeed = !!pathname?.startsWith('/feed')
  // Compose reuses Feed's compact floating pill/orb instead of the denser
  // full-width bar — same reasoning as Feed: a single-object creation
  // screen shouldn't have its layout pushed around by player chrome.
  const usesFloatingChrome = isOnFeed || !!pathname?.startsWith('/compose')

  // Feed shows pill/orb (A.3); karaoke page owns immersive chrome.
  const isHidden =
    engineState.mode === 'idle' ||
    pathname?.startsWith('/song/') ||
    pathname === '/'

  // Fresh play → pill; leaving Feed keeps orb preference until idle/end.
  useEffect(() => { setFeedChrome('pill') }, [songId])

  // Full-width bar reserves page padding; floating pill/orb overlays (h=0).
  useEffect(() => {
    if (isHidden || expanded || usesFloatingChrome) {
      document.documentElement.style.setProperty('--margo-miniplayer-h', '0px')
      return
    }
    const el = barRef.current
    if (!el) return
    const setH = () => {
      document.documentElement.style.setProperty('--margo-miniplayer-h', `${el.offsetHeight}px`)
    }
    setH()
    const ro = new ResizeObserver(setH)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.setProperty('--margo-miniplayer-h', '0px')
    }
  }, [isHidden, expanded, usesFloatingChrome, songId, playing])

  // ── Drag-to-dismiss gesture on the collapsed bar ─────────────────
  const [barOffset, setBarOffset] = useState(0)
  const [barAnimating, setBarAnimating] = useState(false)
  const barDragRef = useRef<{ startY: number; startTime: number } | null>(null)

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('button, a, [data-no-drag]')

  const barDragStart = (clientY: number, target: EventTarget | null) => {
    if (isInteractiveTarget(target)) return
    barDragRef.current = { startY: clientY, startTime: Date.now() }
    setBarAnimating(false)
  }
  const barDragMove = (clientY: number) => {
    const ds = barDragRef.current
    if (!ds) return
    let delta = clientY - ds.startY
    if (delta < 0) delta *= 0.25 // resistance when dragging upward — this bar only dismisses downward
    setBarOffset(delta)
  }
  const barDragEnd = (clientY: number) => {
    const ds = barDragRef.current
    if (!ds) { setBarOffset(0); return }
    const delta = clientY - ds.startY
    const elapsed = Math.max(1, Date.now() - ds.startTime)
    const velocity = delta / elapsed
    barDragRef.current = null
    setBarAnimating(true)
    if (delta > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      setBarOffset(120)
      window.setTimeout(() => {
        setBarOffset(0)
        setBarAnimating(false)
        endSession()
      }, 180)
    } else {
      setBarOffset(0)
    }
  }

  const onBarTouchStart = (e: React.TouchEvent) => barDragStart(e.touches[0].clientY, e.target)
  const onBarTouchMove = (e: React.TouchEvent) => barDragMove(e.touches[0].clientY)
  const onBarTouchEnd = (e: React.TouchEvent) => barDragEnd(e.changedTouches[0].clientY)

  const onBarMouseDown = (e: React.MouseEvent) => {
    barDragStart(e.clientY, e.target)
    if (!barDragRef.current) return
    const onMove = (ev: MouseEvent) => barDragMove(ev.clientY)
    const onUp = (ev: MouseEvent) => {
      barDragEnd(ev.clientY)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Seek bar (unrelated to dismiss drag — marked data-no-drag) ───
  const seekFromX = useCallback((clientX: number) => {
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    if (mode === 'snippet') {
      seekSnippetProgress(pct)
    } else {
      if (duration > 0) playFullSeek((pct / 100) * duration)
    }
  }, [mode, duration])

  const onProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
    seekFromX(e.clientX)
    const onMove = (ev: MouseEvent) => seekFromX(ev.clientX)
    const onUp = () => { setDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onProgressTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    setDragging(true)
    seekFromX(e.touches[0].clientX)
    const onMove = (ev: TouchEvent) => seekFromX(ev.touches[0].clientX)
    const onEnd = () => { setDragging(false); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
  }

  const onSheetTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }
  const onSheetTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 60) setExpanded(false)
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  // Hide when idle or on karaoke page
  if (isHidden) return null

  const isSnippet = mode === 'snippet'
  const vibeColor = vibe ? (VIBE_COLORS[vibe.toLowerCase()] || '#E8C547') : '#E8C547'
  const currentLine = snippet?.lineText || null

  return (
    <>
      <style>{`
        @keyframes riseUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes sheetIn {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes linePulse {
          0%, 100% { opacity: 0.9; }
          50%       { opacity: 1; text-shadow: 0 0 20px rgba(232,197,71,0.3); }
        }
        .mp-bar { animation: riseUp 400ms cubic-bezier(0.34,1.56,0.64,1) forwards; touch-action: pan-x; }
        .mp-sheet { animation: sheetIn 420ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .mp-lyric-pulse { animation: linePulse 3s ease-in-out infinite; }
        .mp-btn { transition: opacity 150ms ease, transform 150ms ease; }
        .mp-btn:active { opacity: 0.65 !important; transform: scale(0.92); }
        @media (hover: hover) and (pointer: fine) {
          .mp-btn:hover { opacity: 0.65 !important; }
        }
        .mp-nav-btn { transition: opacity 200ms ease, transform 200ms ease; }
        .mp-nav-btn:active:not(:disabled) { opacity: 1 !important; transform: scale(1.1); }
        @media (hover: hover) and (pointer: fine) {
          .mp-nav-btn:hover:not(:disabled) { opacity: 1 !important; transform: scale(1.1); }
        }
        .mp-play-btn { transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease; }
        .mp-play-btn:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(232,197,71,0.5) !important; }
        .mp-play-btn:active { transform: scale(0.95); }
        .mp-progress-track:active .mp-progress-thumb { opacity: 1 !important; transform: translate(-50%,-50%) scale(1.3) !important; }
        @media (hover: hover) and (pointer: fine) {
          .mp-progress-track:hover .mp-progress-thumb { opacity: 1 !important; transform: translate(-50%,-50%) scale(1.3) !important; }
        }
        .mp-karaoke-btn { transition: all 200ms ease; }
        .mp-karaoke-btn:active {
          background: rgba(232,197,71,0.14) !important;
          border-color: rgba(232,197,71,0.5) !important;
          letter-spacing: 2.5px !important;
        }
        @media (hover: hover) and (pointer: fine) {
          .mp-karaoke-btn:hover {
            background: rgba(232,197,71,0.14) !important;
            border-color: rgba(232,197,71,0.5) !important;
            letter-spacing: 2.5px !important;
          }
        }
        .mp-close-btn { transition: all 150ms ease; }
        .mp-close-btn:active {
          background: rgba(232,197,71,0.2) !important;
          border-color: rgba(232,197,71,0.5) !important;
        }
        @media (hover: hover) and (pointer: fine) {
          .mp-close-btn:hover {
            background: rgba(232,197,71,0.2) !important;
            border-color: rgba(232,197,71,0.5) !important;
          }
        }
      `}</style>

      {/* ── Compact floating pill → orb (A.3 / D5) — Feed and Compose ── */}
      {!expanded && usesFloatingChrome && (
        <MiniPlayerFeedChrome
          mode={feedChrome}
          artwork={artwork}
          title={title || ''}
          playing={playing}
          buffering={buffering}
          progress={progress}
          vibeColor={vibeColor}
          onExpand={() => setExpanded(true)}
          onTogglePlay={() => void togglePlayPause()}
          onToOrb={() => setFeedChrome('orb')}
          onToPill={() => setFeedChrome('pill')}
          onClose={endSession}
        />
      )}

      {/* ── Collapsed bar (denser chrome — everywhere else) ──────── */}
      {!expanded && !usesFloatingChrome && (
        <div
          ref={barRef}
          className="mp-bar margo-mp-bar"
          onTouchStart={onBarTouchStart}
          onTouchMove={onBarTouchMove}
          onTouchEnd={onBarTouchEnd}
          onMouseDown={onBarMouseDown}
          style={{
            position: 'fixed',
            bottom: 'var(--margo-tabbar-h, 0px)', // stacks above the tab bar — never overlaps it
            left: 0, right: 0, zIndex: 90,
            borderTop: '1px solid rgba(232,197,71,0.12)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            transform: `translateY(${barOffset}px)`,
            opacity: Math.max(0, 1 - Math.max(0, barOffset) / 150),
            transition: barAnimating ? 'transform 200ms ease, opacity 200ms ease' : 'none',
          }}
        >

          {/* Gold progress line — top edge */}
          <div
            data-no-drag
            style={{ position: 'relative', minHeight: 'var(--margo-touch-min)', height: '2px', display: 'flex', alignItems: 'center', background: 'rgba(232,197,71,0.08)', cursor: 'pointer', boxSizing: 'border-box' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = ((e.clientX - rect.left) / rect.width) * 100
              if (isSnippet) seekSnippetProgress(pct)
              else if (duration > 0) playFullSeek((pct / 100) * duration)
            }}
          >
            <div style={{
              height: '100%', width: `${progress}%`,
              background: `linear-gradient(90deg, ${vibeColor}88, ${vibeColor})`,
              transition: dragging ? 'none' : 'width 200ms linear',
              boxShadow: `0 0 8px ${vibeColor}66`,
            }} />
          </div>

          {/* Main row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>

            {/* Artwork */}
            <div onClick={() => setExpanded(true)} style={{ cursor: 'pointer', flexShrink: 0 }}>
              {artwork ? (
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', overflow: 'hidden', boxShadow: `0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,197,71,0.15)` }}>
                  <img src={artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(232,197,71,0.08)', border: '1px solid rgba(232,197,71,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MusicNoteIcon size={16} color="var(--gold)" /></div>
              )}
            </div>

            {/* Track info */}
            <div onClick={() => setExpanded(true)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              {currentLine && (
                <p className="mp-lyric-pulse" style={{
                  fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
                  fontSize: '0.78rem', color: '#E8C547',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  margin: 0, lineHeight: 1.3,
                }}>
                  &ldquo;{currentLine}&rdquo;
                </p>
              )}
              <p style={{
                fontFamily: 'var(--font-lora), serif',
                fontSize: currentLine ? '0.56rem' : '0.78rem',
                color: 'rgba(255,255,255,0.38)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                margin: 0, marginTop: currentLine ? '1px' : '0',
                letterSpacing: '0.6px', textTransform: 'uppercase',
              }}>
                {title}{artist ? ` · ${artist}` : ''}
              </p>
            </div>

            {/* Vibe tag */}
            {vibe && (
              <span style={{
                flexShrink: 0,
                padding: '2px 7px', borderRadius: '50px',
                fontSize: '0.42rem', fontFamily: 'var(--font-lora), serif',
                fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                color: vibeColor,
                background: `${vibeColor}14`,
                border: `1px solid ${vibeColor}30`,
              }}>{vibe}</span>
            )}

            {/* Prev */}
            <button className="mp-nav-btn mp-btn" onClick={() => void queuePrev()} disabled={!canPrev} style={{
              background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'default',
              minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
              padding: '6px', opacity: canPrev ? 0.55 : 0.18, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M19 5L9 12L19 19V5Z" fill="currentColor" />
                <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button className="mp-play-btn" onClick={() => void togglePlayPause()} style={{
              width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%',
              background: '#E8C547', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(232,197,71,0.3)', flexShrink: 0, boxSizing: 'border-box',
            }}>
              <PlayPauseIcon playing={playing} buffering={buffering} size={12} color="#07060A" />
            </button>

            {/* Next */}
            <button className="mp-nav-btn mp-btn" onClick={() => void queueNext()} disabled={!canNext} style={{
              background: 'none', border: 'none', cursor: canNext ? 'pointer' : 'default',
              minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
              padding: '6px', opacity: canNext ? 0.55 : 0.18, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 5L15 12L5 19V5Z" fill="currentColor" />
                <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Mute */}
            <button className="mp-btn" onClick={toggleMute} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: muted ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.4)',
              minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
              padding: '6px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                {muted ? (
                  <>
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                    <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                    <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>

            {/* End listening — stops audio + clears queue (A5).
                Distinct from sheet X / scrim / swipe = collapse only. */}
            <button
              className="mp-btn mp-close-btn"
              onClick={() => endSession()}
              aria-label="End listening"
              style={{
                background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.25)',
                borderRadius: '50%', color: 'var(--gold, #E8C547)',
                minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
                padding: '6px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

          </div>
        </div>
      )}

      {/* ── Expanded sheet ─────────────────────────────────────────── */}
      {expanded && (
        <div
          className="margo-mp-scrim"
          style={{
            position: 'fixed', inset: 0, zIndex: 95,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setExpanded(false)}
        >
          <div
            ref={sheetRef}
            className="mp-sheet"
            onTouchStart={onSheetTouchStart}
            onTouchEnd={onSheetTouchEnd}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '520px',
              background: 'linear-gradient(170deg, rgba(20,16,30,0.99) 0%, rgba(10,9,13,1) 100%)',
              borderTop: `1px solid ${vibeColor}22`,
              borderRadius: '28px 28px 0 0',
              padding: '0 0 calc(36px + env(safe-area-inset-bottom))',
              boxShadow: `0 -24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)`,
            }}
          >
            {/* Swipe handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 0' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <div style={{ padding: '16px 28px 0' }}>

              {/* Top row — vibe tag + collapse (keep session playing).
                  End listening is the sheet button + non-Feed bar X. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                {vibe ? (
                  <span style={{
                    padding: '4px 12px', borderRadius: '50px',
                    fontSize: '0.48rem', fontFamily: 'var(--font-lora), serif',
                    fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: vibeColor, background: `${vibeColor}18`,
                    border: `1px solid ${vibeColor}35`,
                    boxShadow: `0 0 12px ${vibeColor}22`,
                  }}>{vibe}</span>
                ) : <div />}
                <button
                  className="mp-btn mp-close-btn"
                  onClick={() => setExpanded(false)}
                  aria-label="Collapse player"
                  style={{
                    background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.25)',
                    borderRadius: '50%', width: '32px', height: '32px',
                    cursor: 'pointer', color: 'var(--gold, #E8C547)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Artwork */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                {artwork ? (
                  <div style={{
                    width: '120px', height: '120px', borderRadius: '18px', overflow: 'hidden',
                    boxShadow: `0 16px 56px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,197,71,0.12), 0 0 60px ${vibeColor}18`,
                  }}>
                    <img src={artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '120px', height: '120px', borderRadius: '18px',
                    background: `linear-gradient(135deg, ${vibeColor}18, rgba(232,197,71,0.04))`,
                    border: `1px solid ${vibeColor}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 16px 56px rgba(0,0,0,0.5)`,
                  }}>
                    <MusicNoteIcon size={36} color="var(--gold)" />
                  </div>
                )}
              </div>

              {/* Song info */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontWeight: 600,
                  fontSize: '1.15rem', color: 'var(--text)', margin: '0 0 4px',
                }}>{title}</p>
                <p style={{
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: '0.75rem', color: 'var(--text-secondary)',
                  letterSpacing: '0.3px', margin: 0,
                }}>{artist}</p>
              </div>

              {/* Lyric line */}
              {currentLine && (
                <div style={{
                  padding: '20px 24px',
                  background: `linear-gradient(135deg, ${vibeColor}08, rgba(232,197,71,0.03))`,
                  border: `1px solid ${vibeColor}18`,
                  borderRadius: '16px',
                  marginBottom: '28px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(ellipse at 50% 100%, ${vibeColor}10, transparent 70%)`,
                    pointerEvents: 'none',
                  }} />
                  <p className="mp-lyric-pulse" style={{
                    fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
                    fontSize: '1.15rem', color: '#F4F1ED',
                    lineHeight: 1.6, margin: 0, textAlign: 'center',
                    position: 'relative',
                  }}>
                    &ldquo;{currentLine}&rdquo;
                  </p>
                </div>
              )}

              {/* Progress bar */}
              <div style={{ marginBottom: '28px' }}>
                <div
                  ref={progressRef}
                  className="mp-progress-track"
                  onMouseDown={onProgressMouseDown}
                  onTouchStart={onProgressTouchStart}
                  style={{ minHeight: 'var(--margo-touch-min)', height: '20px', display: 'flex', alignItems: 'center', cursor: isSnippet ? 'default' : 'pointer', boxSizing: 'border-box' }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      background: `linear-gradient(90deg, ${vibeColor}99, ${vibeColor})`,
                      borderRadius: '2px',
                      transition: dragging ? 'none' : 'width 200ms linear',
                      boxShadow: `0 0 8px ${vibeColor}55`,
                    }} />
                    {!isSnippet && (
                      <div className="mp-progress-thumb" style={{
                        position: 'absolute', top: '50%', left: `${progress}%`,
                        transform: 'translate(-50%,-50%)',
                        width: '13px', height: '13px', borderRadius: '50%',
                        background: '#E8C547',
                        boxShadow: '0 0 8px rgba(232,197,71,0.6)',
                        opacity: 0, transition: 'all 150ms ease',
                      }} />
                    )}
                  </div>
                </div>
                {!isSnippet && duration > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)' }}>{fmt(currentTime)}</span>
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)' }}>{fmt(duration)}</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', marginBottom: '28px' }}>
                <button className="mp-nav-btn mp-btn" onClick={() => void queuePrev()} disabled={!canPrev} style={{
                  background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'default',
                  color: '#F4F1ED', padding: '10px', opacity: canPrev ? 0.6 : 0.18,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M19 5L9 12L19 19V5Z" fill="currentColor" />
                    <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>

                <button className="mp-play-btn" onClick={() => void togglePlayPause()} style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: '#E8C547', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(232,197,71,0.4)',
                }}>
                  <PlayPauseIcon playing={playing} buffering={buffering} size={20} color="#07060A" />
                </button>

                <button className="mp-nav-btn mp-btn" onClick={() => void queueNext()} disabled={!canNext} style={{
                  background: 'none', border: 'none', cursor: canNext ? 'pointer' : 'default',
                  color: '#F4F1ED', padding: '10px', opacity: canNext ? 0.6 : 0.18,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 5L15 12L5 19V5Z" fill="currentColor" />
                    <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Volume row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', opacity: 0.65 }}>
                <button className="mp-btn" onClick={toggleMute} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: muted ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)',
                  padding: '4px', flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    {muted ? (
                      <>
                        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                        <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </>
                    ) : (
                      <>
                        <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                        <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </>
                    )}
                  </svg>
                </button>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#E8C547', cursor: 'pointer', height: '3px' }}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                  <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {/* Session Up Next — visible queue (A1 / A2) */}
              <div style={{ marginBottom: '24px', maxHeight: '220px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SessionQueueList queue={queue} queueIndex={queueIndex} accent={vibeColor} />
              </div>

              {/* End listening — available here so Feed (no bar X) can clear session */}
              <button
                type="button"
                className="mp-btn"
                onClick={() => endSession()}
                style={{
                  display: 'block', width: '100%', marginBottom: '12px',
                  padding: '12px', minHeight: 'var(--margo-touch-min)',
                  borderRadius: '50px', cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: '0.58rem', fontWeight: 700,
                  letterSpacing: '1.5px', textTransform: 'uppercase',
                  boxSizing: 'border-box',
                }}
              >
                End listening
              </button>

              {/* Full Karaoke CTA */}
              {songId && !isSnippet && (
                <Link
                  href={`/song/${songId}`}
                  onClick={() => setExpanded(false)}
                  className="mp-karaoke-btn"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '16px',
                    background: `linear-gradient(135deg, ${vibeColor}10, rgba(232,197,71,0.06))`,
                    border: `1px solid ${vibeColor}28`,
                    borderRadius: '50px',
                    fontFamily: 'var(--font-lora), serif',
                    fontWeight: 700, fontSize: '0.58rem',
                    letterSpacing: '2px', textTransform: 'uppercase',
                    color: '#E8C547', textDecoration: 'none',
                  }}
                >
                  <span>Full Karaoke</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
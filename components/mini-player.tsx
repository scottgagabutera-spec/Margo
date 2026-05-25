'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  subscribePlayer,
  togglePlayer,
  seekPlayer,
  toggleMute,
  setPlayerVolume,
  navigatePrev,
  navigateNext,
  getQueueState,
  pushToLyricQueue,
  PlayerState,
} from '@/lib/player-store'

// Queue functions live in player-store.ts — imported above

// ── Emotion color map ─────────────────────────────────────────────
const VIBE_COLORS: Record<string, string> = {
  love: '#FF6B9D', heartbreak: '#ff6060', hope: '#7B9FFF',
  nostalgia: '#E8C547', healing: '#4ade80', joy: '#ffc847',
  rage: '#FF6440', loneliness: '#a0a0ff', sendit: '#00e5c8',
  letout: '#c864ff', chill: '#60b8ff', grateful: '#a0e080',
  spiritual: '#c8a0ff', proud: '#FFB347',
}

export function MiniPlayer() {
  const pathname = usePathname()
  const [state, setState] = useState<PlayerState | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const touchStartY = useRef(0)

  useEffect(() => {
    return subscribePlayer(s => {
      setState(s)
      const { canPrev, canNext } = getQueueState()
      setCanPrev(canPrev)
      setCanNext(canNext)
    })
  }, [])

  const handlePrev = useCallback(() => {
    const moment = navigatePrev()
    if (moment) {
      const { canPrev, canNext } = getQueueState()
      setCanPrev(canPrev)
      setCanNext(canNext)
      import('@/lib/player-store').then(({ playTrack }) => playTrack(moment)).catch(() => {})
    }
  }, [])

  const handleNext = useCallback(() => {
    const moment = navigateNext()
    if (moment) {
      const { canPrev, canNext } = getQueueState()
      setCanPrev(canPrev)
      setCanNext(canNext)
      import('@/lib/player-store').then(({ playTrack }) => playTrack(moment)).catch(() => {})
    }
  }, [])

  const seekFromEvent = (clientX: number) => {
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    seekPlayer(pct)
  }

  const onProgressMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    seekFromEvent(e.clientX)
    const onMove = (ev: MouseEvent) => seekFromEvent(ev.clientX)
    const onUp = () => { setDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onProgressTouchStart = (e: React.TouchEvent) => {
    setDragging(true)
    seekFromEvent(e.touches[0].clientX)
    const onMove = (ev: TouchEvent) => seekFromEvent(ev.touches[0].clientX)
    const onEnd = () => { setDragging(false); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
  }

  // Swipe down to collapse
  const onSheetTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }
  const onSheetTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 60) setExpanded(false)
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  if (!state?.track) return null
  if (pathname?.startsWith('/music/player')) return null
  if (pathname?.startsWith('/feed')) return null

  const { track, playing, muted, volume, progress, currentTime, duration } = state
  const vibeColor = track.vibe ? (VIBE_COLORS[track.vibe.toLowerCase()] || '#E8C547') : '#E8C547'

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
        .mp-bar { animation: riseUp 400ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .mp-sheet { animation: sheetIn 420ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .mp-lyric-pulse { animation: linePulse 3s ease-in-out infinite; }
        .mp-btn { transition: opacity 150ms ease, transform 150ms ease; }
        .mp-btn:hover { opacity: 0.65 !important; }
        .mp-btn:active { transform: scale(0.92); }
        .mp-nav-btn { transition: opacity 200ms ease, transform 200ms ease; }
        .mp-nav-btn:hover:not(:disabled) { opacity: 1 !important; transform: scale(1.1); }
        .mp-nav-btn:active:not(:disabled) { transform: scale(0.9); }
        .mp-play-btn { transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease; }
        .mp-play-btn:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(232,197,71,0.5) !important; }
        .mp-play-btn:active { transform: scale(0.95); }
        .mp-progress-track:hover .mp-progress-thumb { opacity: 1 !important; transform: translate(-50%,-50%) scale(1.3) !important; }
        .mp-karaoke-btn { transition: all 200ms ease; }
        .mp-karaoke-btn:hover { background: rgba(232,197,71,0.14) !important; border-color: rgba(232,197,71,0.5) !important; letter-spacing: 2.5px !important; }
      `}</style>

      {/* ── Collapsed bar ─────────────────────────────────────────── */}
      {!expanded && (
        <div className="mp-bar margo-mp-bar" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
          borderTop: '1px solid rgba(232,197,71,0.12)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>

          {/* Gold progress line — top edge */}
          <div style={{ position: 'relative', minHeight: 'var(--margo-touch-min)', height: '2px', display: 'flex', alignItems: 'center', background: 'rgba(232,197,71,0.08)', cursor: 'pointer', boxSizing: 'border-box' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              seekPlayer(((e.clientX - rect.left) / rect.width) * 100)
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
            <div
              onClick={() => setExpanded(true)}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            >
              {track.artwork ? (
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', overflow: 'hidden', boxShadow: `0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,197,71,0.15)` }}>
                  <img src={track.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(232,197,71,0.08)', border: '1px solid rgba(232,197,71,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>♪</div>
              )}
            </div>

            {/* Track info */}
            <div onClick={() => setExpanded(true)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              {track.currentLine && (
                <p className="mp-lyric-pulse" style={{
                  fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
                  fontSize: '0.78rem', color: '#E8C547',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  margin: 0, lineHeight: 1.3,
                }}>
                  &ldquo;{track.currentLine}&rdquo;
                </p>
              )}
              <p style={{
                fontFamily: 'var(--font-lora), serif',
                fontSize: track.currentLine ? '0.56rem' : '0.78rem',
                color: 'rgba(255,255,255,0.38)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                margin: 0, marginTop: track.currentLine ? '1px' : '0',
                letterSpacing: '0.6px', textTransform: 'uppercase',
              }}>
                {track.songTitle}{track.artist ? ` · ${track.artist}` : ''}
              </p>
            </div>

            {/* Vibe tag */}
            {track.vibe && (
              <span style={{
                flexShrink: 0,
                padding: '2px 7px', borderRadius: '50px',
                fontSize: '0.42rem', fontFamily: 'var(--font-lora), serif',
                fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                color: vibeColor,
                background: `${vibeColor}14`,
                border: `1px solid ${vibeColor}30`,
              }}>{track.vibe}</span>
            )}

            {/* Prev */}
            <button className="mp-nav-btn mp-btn" onClick={handlePrev} disabled={!canPrev} style={{
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
            <button className="mp-play-btn" onClick={togglePlayer} style={{
              width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%',
              background: '#E8C547', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(232,197,71,0.3)', flexShrink: 0, boxSizing: 'border-box',
            }}>
              {playing ? (
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                  <rect x="12" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path d="M5 3.5L16.5 10L5 16.5V3.5Z" fill="#07060A" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button className="mp-nav-btn mp-btn" onClick={handleNext} disabled={!canNext} style={{
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

              {/* Top row — vibe tag + close */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                {track.vibe ? (
                  <span style={{
                    padding: '4px 12px', borderRadius: '50px',
                    fontSize: '0.48rem', fontFamily: 'var(--font-lora), serif',
                    fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: vibeColor, background: `${vibeColor}18`,
                    border: `1px solid ${vibeColor}35`,
                    boxShadow: `0 0 12px ${vibeColor}22`,
                  }}>{track.vibe}</span>
                ) : <div />}
                <button className="mp-btn" onClick={() => setExpanded(false)} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '50%', width: '32px', height: '32px',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontFamily: 'serif',
                }}>×</button>
              </div>

              {/* Artwork — centered, large */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                {track.artwork ? (
                  <div style={{
                    width: '120px', height: '120px', borderRadius: '18px', overflow: 'hidden',
                    boxShadow: `0 16px 56px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,197,71,0.12), 0 0 60px ${vibeColor}18`,
                  }}>
                    <img src={track.artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '120px', height: '120px', borderRadius: '18px',
                    background: `linear-gradient(135deg, ${vibeColor}18, rgba(232,197,71,0.04))`,
                    border: `1px solid ${vibeColor}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem',
                    boxShadow: `0 16px 56px rgba(0,0,0,0.5)`,
                  }}>♪</div>
                )}
              </div>

              {/* Song info */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{
                  fontFamily: 'var(--font-lora), serif', fontWeight: 600,
                  fontSize: '1rem', color: '#F4F1ED', margin: '0 0 4px',
                }}>{track.songTitle}</p>
                <p style={{
                  fontFamily: 'var(--font-lora), serif',
                  fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)',
                  letterSpacing: '1px', textTransform: 'uppercase', margin: 0,
                }}>{track.artist}</p>
              </div>

              {/* Lyric line — the Margo hero element */}
              {track.currentLine && (
                <div style={{
                  padding: '20px 24px',
                  background: `linear-gradient(135deg, ${vibeColor}08, rgba(232,197,71,0.03))`,
                  border: `1px solid ${vibeColor}18`,
                  borderRadius: '16px',
                  marginBottom: '28px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Subtle glow behind lyric */}
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
                    &ldquo;{track.currentLine}&rdquo;
                  </p>
                </div>
              )}

              {/* Progress bar — snippets show thin bar, full songs show seek */}
              <div style={{ marginBottom: '28px' }}>
                <div
                  ref={progressRef}
                  className="mp-progress-track"
                  onMouseDown={onProgressMouseDown}
                  onTouchStart={onProgressTouchStart}
                  style={{ minHeight: 'var(--margo-touch-min)', height: '20px', display: 'flex', alignItems: 'center', cursor: track.isSnippet ? 'default' : 'pointer', boxSizing: 'border-box' }}
                >
                  <div style={{ position: 'relative', width: '100%', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      background: `linear-gradient(90deg, ${vibeColor}99, ${vibeColor})`,
                      borderRadius: '2px',
                      transition: dragging ? 'none' : 'width 200ms linear',
                      boxShadow: `0 0 8px ${vibeColor}55`,
                    }} />
                    {!track.isSnippet && (
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
                {!track.isSnippet && duration > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)' }}>{fmt(currentTime)}</span>
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.5rem', color: 'rgba(255,255,255,0.28)' }}>{fmt(duration)}</span>
                  </div>
                )}
              </div>

              {/* Controls — prev · play/pause · next */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', marginBottom: '28px' }}>

                {/* Prev */}
                <button className="mp-nav-btn mp-btn" onClick={handlePrev} disabled={!canPrev} style={{
                  background: 'none', border: 'none', cursor: canPrev ? 'pointer' : 'default',
                  color: '#F4F1ED', padding: '10px', opacity: canPrev ? 0.6 : 0.18,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M19 5L9 12L19 19V5Z" fill="currentColor" />
                    <line x1="5" y1="5" x2="5" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </button>

                {/* Play/Pause — hero button */}
                <button className="mp-play-btn" onClick={togglePlayer} style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: '#E8C547', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(232,197,71,0.4)',
                }}>
                  {playing ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="4" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                      <rect x="12" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 3.5L16.5 10L5 16.5V3.5Z" fill="#07060A" />
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button className="mp-nav-btn mp-btn" onClick={handleNext} disabled={!canNext} style={{
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
                  onChange={e => setPlayerVolume(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#E8C547', cursor: 'pointer', height: '3px' }}
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                  <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {/* Full Karaoke CTA */}
              {track.songId && (
                <Link
                  href={`/music/player?id=${track.songId}&autoplay=1`}
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

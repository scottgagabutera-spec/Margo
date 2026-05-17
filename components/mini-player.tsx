'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  subscribePlayer,
  togglePlayer,
  seekPlayer,
  toggleMute,
  setPlayerVolume,
  PlayerState,
} from '@/lib/player-store'

export function MiniPlayer() {
  const [state, setState] = useState<PlayerState | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const progressRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return subscribePlayer(s => setState(s))
  }, [])

  // Don't render until something has been played
  if (!state?.track) return null

  const { track, playing, muted, volume, progress, currentTime, duration } = state

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  const seekFromEvent = (clientX: number) => {
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    seekPlayer(pct)
  }

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    seekFromEvent(e.clientX)
    const onMove = (ev: MouseEvent) => seekFromEvent(ev.clientX)
    const onUp = () => { setDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setDragging(true)
    seekFromEvent(e.touches[0].clientX)
    const onMove = (ev: TouchEvent) => seekFromEvent(ev.touches[0].clientX)
    const onEnd = () => { setDragging(false); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
  }

  return (
    <>
      <style>{`
        @keyframes slideUpPlayer {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes expandSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .mini-player-bar {
          animation: slideUpPlayer 350ms cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .mini-player-progress:hover .mini-player-thumb {
          opacity: 1 !important;
          transform: translate(-50%, -50%) scale(1.2) !important;
        }
        .mini-player-btn:hover { opacity: 0.75 !important; }
        .mini-player-expand-sheet {
          animation: expandSheet 380ms cubic-bezier(0.32,0.72,0,1) forwards;
        }
      `}</style>

      {/* ── Collapsed bar ── */}
      {!expanded && (
        <div
          className="mini-player-bar"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
            background: 'rgba(11,10,14,0.97)',
            borderTop: '1px solid rgba(232,197,71,0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Gold progress bar — very top edge */}
          <div
            ref={progressRef}
            className="mini-player-progress"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{ position: 'relative', height: '3px', background: 'rgba(232,197,71,0.12)', cursor: 'pointer' }}
          >
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold, #E8C547)', transition: dragging ? 'none' : 'width 200ms linear' }} />
            <div
              className="mini-player-thumb"
              style={{
                position: 'absolute', top: '50%', left: `${progress}%`,
                transform: 'translate(-50%, -50%)',
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--gold, #E8C547)',
                opacity: 0, transition: 'all 150ms ease',
              }}
            />
          </div>

          {/* Main row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>

            {/* Artwork */}
            {track.artwork ? (
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <img src={track.artwork} alt={track.songTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0, background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>♪</span>
              </div>
            )}

            {/* Track info — tappable to expand */}
            <div
              onClick={() => setExpanded(true)}
              style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
            >
              {track.currentLine ? (
                <p style={{
                  fontFamily: 'var(--font-lora), serif', fontStyle: 'italic',
                  fontSize: '0.82rem', color: 'var(--gold, #E8C547)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  margin: 0, lineHeight: 1.3,
                }}>
                  &ldquo;{track.currentLine}&rdquo;
                </p>
              ) : null}
              <p style={{
                fontFamily: 'var(--font-lora), serif',
                fontSize: track.currentLine ? '0.58rem' : '0.82rem',
                color: track.currentLine ? 'rgba(255,255,255,0.4)' : 'var(--text, #F4F1ED)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                margin: 0, marginTop: track.currentLine ? '2px' : '0',
                letterSpacing: track.currentLine ? '0.5px' : '0',
              }}>
                {track.songTitle}{track.artist ? ` · ${track.artist}` : ''}
              </p>
            </div>

            {/* Time */}
            {!track.isSnippet && duration > 0 && (
              <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                {fmt(currentTime)}
              </span>
            )}

            {/* Mute */}
            <button
              className="mini-player-btn"
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, color: muted ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)', transition: 'opacity 150ms ease' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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

            {/* Play / Pause */}
            <button
              className="mini-player-btn"
              onClick={togglePlayer}
              style={{
                width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--gold, #E8C547)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'opacity 150ms ease',
              }}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                  <rect x="12" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <path d="M5 3.5L16.5 10L5 16.5V3.5Z" fill="#07060A" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Expanded sheet ── */}
      {expanded && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 95,
            background: 'rgba(7,6,10,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setExpanded(false)}
        >
          <div
            className="mini-player-expand-sheet"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px',
              background: 'linear-gradient(160deg, rgba(22,18,32,0.99) 0%, rgba(11,10,14,1) 100%)',
              borderTop: '1px solid rgba(232,197,71,0.15)',
              borderRadius: '24px 24px 0 0',
              padding: '0 0 calc(32px + env(safe-area-inset-bottom))',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.12)' }} />
            </div>

            <div style={{ padding: '20px 28px 0' }}>
              {/* Close */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <button
                  onClick={() => setExpanded(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '1.2rem', fontFamily: 'var(--font-lora), serif', padding: '4px' }}
                >×</button>
              </div>

              {/* Artwork + info */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
                {track.artwork ? (
                  <div style={{ width: '72px', height: '72px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    <img src={track.artwork} alt={track.songTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: '72px', height: '72px', borderRadius: '12px', flexShrink: 0, background: 'rgba(232,197,71,0.08)', border: '1px solid rgba(232,197,71,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.5rem' }}>♪</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text, #F4F1ED)', marginBottom: '4px', lineHeight: 1.2 }}>{track.songTitle}</p>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>{track.artist}</p>
                  {track.isSnippet && (
                    <span style={{ display: 'inline-block', marginTop: '6px', padding: '2px 8px', background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.25)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontSize: '0.48rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold, #E8C547)' }}>Snippet</span>
                  )}
                </div>
              </div>

              {/* Current lyric line */}
              {track.currentLine && (
                <div style={{ padding: '16px 20px', background: 'rgba(232,197,71,0.04)', border: '1px solid rgba(232,197,71,0.12)', borderRadius: '14px', marginBottom: '24px' }}>
                  <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text, #F4F1ED)', lineHeight: 1.55, margin: 0 }}>
                    &ldquo;{track.currentLine}&rdquo;
                  </p>
                </div>
              )}

              {/* Progress bar — full song only */}
              {!track.isSnippet && (
                <div style={{ marginBottom: '20px' }}>
                  <div
                    ref={progressRef}
                    onMouseDown={onMouseDown}
                    onTouchStart={onTouchStart}
                    style={{ height: '24px', display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '4px' }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold, #E8C547)', borderRadius: '2px', transition: dragging ? 'none' : 'width 200ms linear' }} />
                      <div style={{ position: 'absolute', top: '50%', left: `${progress}%`, transform: 'translate(-50%,-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--gold, #E8C547)', boxShadow: '0 0 6px rgba(232,197,71,0.5)', transition: dragging ? 'none' : 'left 200ms linear' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)' }}>{fmt(currentTime)}</span>
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)' }}>{duration > 0 ? fmt(duration) : '--:--'}</span>
                  </div>
                </div>
              )}

              {/* Controls row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
                {/* Mute / volume */}
                <button onClick={toggleMute} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', padding: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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

                {/* Volume slider */}
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={e => setPlayerVolume(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--gold, #E8C547)', cursor: 'pointer' }}
                />

                {/* Play/Pause — large */}
                <button
                  onClick={togglePlayer}
                  style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gold, #E8C547)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 28px rgba(232,197,71,0.35)', flexShrink: 0 }}
                >
                  {playing ? (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <rect x="4" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                      <rect x="12" y="3" width="4" height="14" rx="1.5" fill="#07060A" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M5 3.5L16.5 10L5 16.5V3.5Z" fill="#07060A" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Full Karaoke CTA */}
              {track.songId && (
                <Link
                  href={`/music/player?id=${track.songId}`}
                  onClick={() => setExpanded(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', background: 'rgba(232,197,71,0.08)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold, #E8C547)', textDecoration: 'none', transition: 'all 200ms ease' }}
                >
                  Full Karaoke →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

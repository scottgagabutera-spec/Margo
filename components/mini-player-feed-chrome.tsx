'use client'

import { useRef, useState } from 'react'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { MusicNoteIcon } from '@/components/icons'

const PILL_SWIPE_DISTANCE = 36
const PILL_SWIPE_VELOCITY = 0.45

/**
 * Feed-only collapsed chrome (D5 / A.3): floating pill → swipe-down orb.
 * Overlay — does not publish --margo-miniplayer-h (cards keep full height).
 */
export function MiniPlayerFeedChrome({
  mode,
  artwork,
  title,
  playing,
  buffering,
  progress,
  vibeColor,
  onExpand,
  onTogglePlay,
  onToOrb,
  onToPill,
  onClose,
}: {
  mode: 'pill' | 'orb'
  artwork: string | null
  title: string
  playing: boolean
  buffering: boolean
  progress: number
  vibeColor: string
  onExpand: () => void
  onTogglePlay: () => void
  onToOrb: () => void
  onToPill: () => void
  /** Dismiss/end-listening — same action as the expanded sheet's end-listening control. */
  onClose: () => void
}) {
  if (mode === 'orb') {
    return (
      <FeedOrb
        artwork={artwork}
        playing={playing}
        buffering={buffering}
        progress={progress}
        vibeColor={vibeColor}
        onTap={onToPill}
        onClose={onClose}
      />
    )
  }

  return (
    <FeedPill
      artwork={artwork}
      title={title}
      playing={playing}
      buffering={buffering}
      progress={progress}
      vibeColor={vibeColor}
      onExpand={onExpand}
      onTogglePlay={onTogglePlay}
      onToOrb={onToOrb}
      onClose={onClose}
    />
  )
}

/**
 * Small, visually secondary dismiss control shared by the pill and orb.
 * A 44px touch box (brand's Tier 5 pattern) around a quiet 20px circle —
 * distinct from play/pause (playback) and the artwork/title tap target
 * (expand). Never the loudest thing in the corner.
 */
function DismissButton({ onClose, offset }: { onClose: () => void; offset: number }) {
  return (
    <button
      type="button"
      aria-label="End listening"
      data-no-drag
      onClick={(e) => { e.stopPropagation(); onClose() }}
      style={{
        position: 'absolute', top: `${-offset}px`, right: `${-offset}px`,
        width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        zIndex: 1,
      }}
    >
      {/* Explicit product decision: gold, not the brand system's default
          muted Ghost/Dismiss treatment (MARGO_BRAND.md Section 10, Tier 5).
          Phone testing showed the dismiss control wasn't visible enough
          against the floating player. Still visually secondary to
          play/pause — small 20px circle vs. the 44px play/pause touch
          target, same corner-anchored position — this only changes color. */}
      <span style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: 'var(--margo-bar)', border: '1px solid var(--gold-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gold)',
      }}>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  )
}

function FeedPill({
  artwork,
  title,
  playing,
  buffering,
  progress,
  vibeColor,
  onExpand,
  onTogglePlay,
  onToOrb,
  onClose,
}: {
  artwork: string | null
  title: string
  playing: boolean
  buffering: boolean
  progress: number
  vibeColor: string
  onExpand: () => void
  onTogglePlay: () => void
  onToOrb: () => void
  onClose: () => void
}) {
  const dragRef = useRef<{ startY: number; startTime: number } | null>(null)
  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)

  const isInteractive = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('button')

  const onStart = (clientY: number, target: EventTarget | null) => {
    if (isInteractive(target)) return
    dragRef.current = { startY: clientY, startTime: Date.now() }
    setAnimating(false)
  }

  const onMove = (clientY: number) => {
    const ds = dragRef.current
    if (!ds) return
    let delta = clientY - ds.startY
    if (delta < 0) delta *= 0.2
    setOffset(delta)
  }

  const onEnd = (clientY: number) => {
    const ds = dragRef.current
    if (!ds) {
      setOffset(0)
      return
    }
    const delta = clientY - ds.startY
    const elapsed = Math.max(1, Date.now() - ds.startTime)
    const velocity = delta / elapsed
    dragRef.current = null
    setAnimating(true)
    if (delta > PILL_SWIPE_DISTANCE || velocity > PILL_SWIPE_VELOCITY) {
      setOffset(48)
      window.setTimeout(() => {
        setOffset(0)
        setAnimating(false)
        onToOrb()
      }, 160)
      return
    }
    setOffset(0)
  }

  return (
    <div
      className="mp-feed-pill"
      onTouchStart={(e) => onStart(e.touches[0].clientY, e.target)}
      onTouchMove={(e) => onMove(e.touches[0].clientY)}
      onTouchEnd={(e) => onEnd(e.changedTouches[0].clientY)}
      style={{
        position: 'fixed',
        right: '12px',
        /* Stacks above any active KeyboardSafeCtaBar (Compose's Continue)
           as well as the tab bar — --margo-cta-bar-h is 0 wherever no such
           bar is rendered (e.g. Feed), so this is a no-op there. */
        bottom: 'calc(var(--margo-cta-bar-h, 0px) + var(--margo-tabbar-h, 80px) + 10px)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: 'min(200px, calc(100vw - 24px))',
        minHeight: 'var(--margo-touch-min)',
        padding: '6px 8px 6px 6px',
        borderRadius: '999px',
        background: 'var(--margo-bar)',
        border: `1px solid ${vibeColor}35`,
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        transform: `translateY(${Math.max(0, offset)}px)`,
        opacity: Math.max(0.35, 1 - Math.max(0, offset) / 80),
        transition: animating ? 'transform 160ms ease, opacity 160ms ease' : 'none',
        boxSizing: 'border-box',
        touchAction: 'none',
      }}
    >
      {/* Progress hairline */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '10px',
          right: '10px',
          top: '3px',
          height: '2px',
          borderRadius: '1px',
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, progress))}%`,
            background: vibeColor,
            borderRadius: '1px',
          }}
        />
      </div>

      <button
        type="button"
        aria-label={`Expand player · ${title || 'Now playing'}`}
        onClick={onExpand}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0,
          flex: 1,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <MusicNoteIcon size={14} color="var(--gold)" />
          )}
        </div>
        <span
          style={{
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {title || 'Now playing'}
        </span>
      </button>

      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={onTogglePlay}
        style={{
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--gold)',
          color: '#07060A',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxSizing: 'border-box',
          padding: 0,
        }}
      >
        <PlayPauseIcon playing={playing} buffering={buffering} size={12} color="#07060A" />
      </button>

      <DismissButton onClose={onClose} offset={20} />
    </div>
  )
}

function FeedOrb({
  artwork,
  playing,
  buffering,
  progress,
  vibeColor,
  onTap,
  onClose,
}: {
  artwork: string | null
  playing: boolean
  buffering: boolean
  progress: number
  vibeColor: string
  onTap: () => void
  onClose: () => void
}) {
  const size = 52
  const stroke = 2.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, progress)) / 100
  const dashOffset = c * (1 - pct)

  return (
    // Outer element is a plain div, not a button — FeedOrb's tap target
    // and the dismiss control are two separate buttons, and buttons can't
    // nest inside each other.
    <div
      className="mp-feed-orb"
      style={{
        position: 'fixed',
        right: '14px',
        bottom: 'calc(var(--margo-cta-bar-h, 0px) + var(--margo-tabbar-h, 80px) + 12px)',
        zIndex: 90,
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <button
        type="button"
        aria-label={playing || buffering ? 'Expand player chrome' : 'Show player'}
        onClick={onTap}
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          border: 'none',
          padding: 0,
          background: 'transparent',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={vibeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: '5px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--margo-bar)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {artwork ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--gold)" />
          )}
        </div>
      </button>

      <DismissButton onClose={onClose} offset={16} />
    </div>
  )
}

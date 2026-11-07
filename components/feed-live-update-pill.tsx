'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isPreciseTap, type PreciseTapStart, PRECISE_TAP_MAX_MS } from '@/lib/touch/precise-tap'
import type { LiveUpdateKind } from '@/lib/live-updates/copy'
import { liveUpdateLabel } from '@/lib/live-updates/copy'

function LiveUpdateIcon({ kind }: { kind: LiveUpdateKind }) {
  const s = 14
  if (kind === 'posts') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden>
        <path fill="currentColor" d="M3 4.5c0-.8.7-1.5 1.5-1.5h7c.8 0 1.5.7 1.5 1.5v7c0 .8-.7 1.5-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5v-7Zm1.2 0v7h7.6v-7H4.2Z" />
        <path fill="currentColor" d="M6.2 7.2h3.6v1.2H6.2V7.2Zm0 2.2h2.4v1.2H6.2V9.4Z" />
      </svg>
    )
  }
  if (kind === 'artists') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden>
        <circle cx="6.5" cy="5.5" r="2.2" fill="currentColor" />
        <path fill="currentColor" d="M2.5 13v-.8c0-1.6 1.3-2.9 2.9-2.9h2.2c1.6 0 2.9 1.3 2.9 2.9v.8H2.5Zm8.2-1.2h1.1c.7 0 1.2-.5 1.2-1.2V9.4h1.2v1.2c0 1.4-1.1 2.5-2.5 2.5h-.5v-.3Z" />
        <path fill="currentColor" d="M11.8 4.8h2.2v1.2h-2.2V4.8Zm.5 1.8h1.2V8h-1.2V6.6Z" />
      </svg>
    )
  }
  if (kind === 'songs') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden>
        <path fill="currentColor" d="M6.5 3.2v9.1c-.5.3-1.1.5-1.7.5-1.5 0-2.7-1-2.7-2.2s1.2-2.2 2.7-2.2c.4 0 .8.1 1.1.2V5.4l5.5-1.4v2.1c-.5.3-1 .4-1.5.4-1.5 0-2.6-1-2.6-2.1 0-.3.1-.6.2-.9l1.3.3c-.1.2-.1.4-.1.6 0 .7.5 1.2 1.2 1.2.5 0 .9-.2 1.2-.5V3.2L6.5 4.6Z" />
      </svg>
    )
  }
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.8" cy="6.2" r="1.1" fill="currentColor" />
      <path fill="currentColor" d="M3.8 11.2 6.4 8.6l1.8 1.6 2.4-2.8 2.2 3.8H3.8Z" />
    </svg>
  )
}

export function FeedLiveUpdatePill({
  kind,
  count,
  onActivate,
  onDismiss,
  reducedMotion,
}: {
  kind: LiveUpdateKind
  count: number
  onActivate: () => void
  onDismiss: () => void
  reducedMotion: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)
  const tapStart = useRef<PreciseTapStart | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const scheduleDismiss = useCallback(() => {
    clearTimer()
    if (paused) return
    timerRef.current = setTimeout(() => {
      setVisible(false)
      window.setTimeout(onDismiss, reducedMotion ? 0 : 350)
    }, 4000)
  }, [onDismiss, paused, reducedMotion])

  useEffect(() => {
    setVisible(true)
    scheduleDismiss()
    return clearTimer
  }, [kind, count, scheduleDismiss])

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    tapStart.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    setPaused(true)
    clearTimer()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    const start = tapStart.current
    tapStart.current = null
    if (isPreciseTap(start, e.clientX, e.clientY, Date.now())) {
      onActivate()
      onDismiss()
      return
    }
    setPaused(false)
    scheduleDismiss()
  }

  return (
    <div
      className="margo-feed-live-update-float"
      style={{
        position: 'fixed',
        top: 'calc(var(--nav-height, 72px) + var(--margo-feed-tab-bar-h, 40px) + env(safe-area-inset-top, 0px) + 6px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '44px',
      }}
    >
      <button
        type="button"
        className="margo-feed-live-update-pill"
        aria-live="polite"
        style={{
          pointerEvents: 'auto',
          minHeight: '44px',
          height: '32px',
          padding: '0 14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 230, 160, 0.55)',
          background: '#E8C547',
          color: '#07060A',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          boxShadow: '0 0 0 1px rgba(255, 240, 180, 0.35), 0 6px 20px rgba(232, 197, 71, 0.35)',
          opacity: visible ? 1 : 0,
          transition: reducedMotion ? 'opacity 200ms ease' : 'opacity 350ms ease',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setPaused(false)
          scheduleDismiss()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <LiveUpdateIcon kind={kind} />
        <span>{liveUpdateLabel(kind, count)}</span>
      </button>
    </div>
  )
}

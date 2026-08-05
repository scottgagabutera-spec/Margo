'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import MargoLogo from '@/components/MargoLogo'

const THRESHOLD = 80
const MAX_PULL = 130
const font = 'var(--font-lora), serif'

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  /** When false, gesture is disabled (e.g. offline modal open). Default true. */
  enabled?: boolean
  /** Optional: parent can hide sibling UI (e.g. new-posts pill) while refreshing. */
  onRefreshingChange?: (refreshing: boolean) => void
}

/**
 * Lightweight pull-to-refresh for primary scroll pages.
 * Touch-driven (does not rely on browser overscroll bounce).
 * Indicator uses brand mark + motion across pull / ready / refreshing.
 */
export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  onRefreshingChange,
}: PullToRefreshProps) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  const onRefreshingChangeRef = useRef(onRefreshingChange)
  onRefreshRef.current = onRefresh
  onRefreshingChangeRef.current = onRefreshingChange

  const atTop = useCallback(() => {
    if (typeof window === 'undefined') return false
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 2
  }, [])

  useEffect(() => {
    if (!enabled) return

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || !atTop()) {
        pulling.current = false
        return
      }
      pulling.current = true
      startY.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || refreshingRef.current) return
      if (!atTop()) {
        pulling.current = false
        pullRef.current = 0
        setPull(0)
        return
      }
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        pullRef.current = 0
        setPull(0)
        return
      }
      // Resist scroll chaining while pulling down from top
      if (dy > 8 && e.cancelable) e.preventDefault()
      const damped = Math.min(MAX_PULL, dy * 0.55)
      pullRef.current = damped
      setPull(damped)
    }

    const onTouchEnd = async () => {
      if (!pulling.current) return
      pulling.current = false
      const distance = pullRef.current
      const shouldRefresh = distance >= THRESHOLD && !refreshingRef.current
      if (!shouldRefresh) {
        pullRef.current = 0
        setPull(0)
        return
      }
      refreshingRef.current = true
      setRefreshing(true)
      onRefreshingChangeRef.current?.(true)
      pullRef.current = THRESHOLD
      setPull(THRESHOLD)
      try {
        await onRefreshRef.current()
      } finally {
        refreshingRef.current = false
        setRefreshing(false)
        onRefreshingChangeRef.current?.(false)
        pullRef.current = 0
        setPull(0)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, atTop])

  const progress = Math.min(1, pull / THRESHOLD)
  const ready = pull >= THRESHOLD && !refreshing
  const pullRotation = progress * 200

  let markClass = ''
  if (refreshing) markClass = 'margo-spin'
  else if (ready) markClass = 'margo-soft-pulse'

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          height: pull,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pointerEvents: 'none',
          overflow: 'hidden',
          transition: refreshing || pull === 0 ? 'height 280ms var(--ease-out)' : undefined,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            opacity: Math.max(progress, refreshing ? 1 : 0),
            transform: `scale(${0.75 + progress * 0.25}) translateY(${(1 - progress) * 8}px)`,
            transition: refreshing ? 'opacity 150ms var(--ease-out)' : undefined,
          }}
        >
          <div
            style={{
              width: 'var(--margo-touch-min)',
              height: 'var(--margo-touch-min)',
              borderRadius: '50%',
              background: ready || refreshing ? 'var(--gold-faint)' : 'var(--surface-2)',
              border: `1px solid ${ready || refreshing ? 'var(--gold-border)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: ready || refreshing ? '0 0 20px var(--gold-glow)' : 'none',
              transition: 'background 150ms var(--ease-out), border-color 150ms var(--ease-out), box-shadow 150ms var(--ease-out)',
            }}
          >
            <div
              className={markClass}
              style={{
                display: 'flex',
                transform: refreshing || ready ? undefined : `rotate(${pullRotation}deg)`,
                transition: ready ? 'transform 200ms var(--ease-out)' : undefined,
              }}
            >
              <MargoLogo tier="mark" size={22} />
            </div>
          </div>
          <span
            style={{
              fontFamily: font,
              fontSize: '0.6rem',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}
          >
            {refreshing ? 'Refreshing…' : ready ? 'Release' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      {children}
    </>
  )
}

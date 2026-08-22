'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LoadingRing } from '@/components/loading-ring'
import { MargoSymbol } from '@/components/margo-symbol'
import { readActiveScrollTop } from '@/components/primary-tab-shell'

const THRESHOLD = 72
const MAX_PULL = 120
const UPDATED_FLASH_MS = 1400

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  /** When false, gesture is disabled (e.g. offline modal open). Default true. */
  enabled?: boolean
  /** Optional: parent can hide sibling UI (e.g. new-posts pill) while refreshing. */
  onRefreshingChange?: (refreshing: boolean) => void
}

/**
 * Margo-branded pull-to-refresh for primary scroll pages.
 * Touch-driven; uses the active primary-tab pane scrollTop when mounted.
 * Indicator: Margo Symbol + gold ring (pull progress → spin → brief Updated).
 */
export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  onRefreshingChange,
}: PullToRefreshProps) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [showUpdated, setShowUpdated] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  const updatedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onRefreshRef = useRef(onRefresh)
  const onRefreshingChangeRef = useRef(onRefreshingChange)
  onRefreshRef.current = onRefresh
  onRefreshingChangeRef.current = onRefreshingChange

  const atTop = useCallback(() => readActiveScrollTop() <= 2, [])

  useEffect(() => {
    return () => {
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current)
    }
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
      if (dy > 8 && e.cancelable) e.preventDefault()
      const damped = Math.min(MAX_PULL, dy * 0.5)
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
      setShowUpdated(false)
      onRefreshingChangeRef.current?.(true)
      pullRef.current = THRESHOLD
      setPull(THRESHOLD)
      try {
        await onRefreshRef.current()
        setShowUpdated(true)
        if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current)
        updatedTimerRef.current = setTimeout(() => setShowUpdated(false), UPDATED_FLASH_MS)
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
  const ringState = refreshing ? 'spinning' : ready ? 'ready' : 'progress'
  const visible = refreshing || pull > 0 || showUpdated

  const indicator = (
    <div
      aria-hidden={!visible}
      aria-label={
        refreshing
          ? 'Refreshing'
          : showUpdated
            ? 'Feed updated'
            : ready
              ? 'Release to refresh'
              : 'Pull to refresh'
      }
      style={{
        position: 'fixed',
        top: 'var(--nav-height, 72px)',
        left: 0,
        right: 0,
        zIndex: 40,
        height: refreshing || showUpdated ? THRESHOLD : pull,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
        overflow: 'hidden',
        transition: refreshing || pull === 0 ? 'height 260ms var(--ease-out)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          paddingBottom: showUpdated && !refreshing ? '12px' : '8px',
          opacity: showUpdated && !refreshing ? 1 : Math.max(progress, refreshing ? 1 : 0),
          transform: showUpdated
            ? 'translateY(0)'
            : `scale(${0.8 + progress * 0.2}) translateY(${(1 - progress) * 6}px)`,
          transition: 'opacity 200ms var(--ease-out), transform 200ms var(--ease-out)',
        }}
      >
        <LoadingRing
          size={40}
          strokeWidth={2}
          state={showUpdated && !refreshing ? 'ready' : ringState}
          progress={progress}
        >
          <MargoSymbol size={18} />
        </LoadingRing>
        {showUpdated && !refreshing && (
          <span
            style={{
              fontFamily: 'var(--font-lora), serif',
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--gold)',
              animation: 'fadeInUp 200ms var(--ease-out) both',
            }}
          >
            Updated
          </span>
        )}
      </div>
    </div>
  )

  return (
    <>
      {mounted ? createPortal(indicator, document.body) : null}
      {children}
    </>
  )
}

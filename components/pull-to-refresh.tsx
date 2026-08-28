'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LoadingRing } from '@/components/loading-ring'
import { MargoSymbol } from '@/components/margo-symbol'
import { readActiveScrollTop } from '@/components/primary-tab-shell'

const THRESHOLD = 52
const MAX_PULL = 72
const REFRESH_SHIFT = 36

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>
  children: ReactNode
  /** When false, gesture is disabled (e.g. offline modal open). Default true. */
  enabled?: boolean
  /** Optional: parent can hide sibling UI (e.g. new-posts pill) while refreshing. */
  onRefreshingChange?: (refreshing: boolean) => void
}

/**
 * Gentle pull-to-refresh. Indicator + list follow the finger, then settle.
 * No "Updated" flash — the list returning is the confirmation.
 */
export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  onRefreshingChange,
}: PullToRefreshProps) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  const onRefreshingChangeRef = useRef(onRefreshingChange)
  onRefreshRef.current = onRefresh
  onRefreshingChangeRef.current = onRefreshingChange

  const atTop = useCallback(() => readActiveScrollTop() <= 2, [])

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
      if (dy > 10 && e.cancelable) e.preventDefault()
      const damped = Math.min(MAX_PULL, dy * 0.28)
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
      pullRef.current = REFRESH_SHIFT
      setPull(REFRESH_SHIFT)
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
  const ringState = refreshing ? 'spinning' : ready ? 'ready' : 'progress'
  const visible = refreshing || pull > 0
  const shift = refreshing ? REFRESH_SHIFT : pull

  const indicator = (
    <div
      aria-hidden={!visible}
      aria-label={refreshing ? 'Refreshing' : ready ? 'Release to refresh' : 'Pull to refresh'}
      style={{
        position: 'fixed',
        top: 'var(--nav-height, 72px)',
        left: 0,
        right: 0,
        zIndex: 40,
        height: shift,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'none',
        overflow: 'hidden',
        transition: refreshing || pull === 0 ? 'height 400ms var(--ease-out)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '8px',
          opacity: Math.max(progress, refreshing ? 1 : 0),
          transform: `scale(${0.88 + progress * 0.12})`,
          transition: 'opacity 280ms var(--ease-out), transform 280ms var(--ease-out)',
        }}
      >
        <LoadingRing
          size={28}
          strokeWidth={1.5}
          state={ringState}
          progress={progress}
        >
          <MargoSymbol size={14} />
        </LoadingRing>
      </div>
    </div>
  )

  return (
    <>
      {mounted ? createPortal(indicator, document.body) : null}
      <div
        style={{
          transform: shift > 0 ? `translateY(${shift}px)` : undefined,
          transition: refreshing || pull === 0 ? 'transform 400ms var(--ease-out)' : 'none',
          willChange: shift > 0 ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </>
  )
}

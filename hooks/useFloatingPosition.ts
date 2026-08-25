'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface FloatingBounds {
  width: number
  height: number
}

export interface UseFloatingPositionOptions {
  storageKey: string
  elementRef: React.RefObject<HTMLElement | null>
  /** Default anchor: bottom-right offset from edges (px). */
  defaultInset?: { right: number; bottom: number }
  /** Extra padding inside the usable viewport (safe areas + chrome). */
  getViewportInsets?: () => { top: number; right: number; bottom: number; left: number }
  enabled?: boolean
}

function readStored(key: string): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return { x: parsed.x, y: parsed.y }
  } catch { /* ignore */ }
  return null
}

function writeStored(key: string, pos: { x: number; y: number } | null) {
  if (typeof window === 'undefined') return
  try {
    if (!pos) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(pos))
  } catch { /* ignore */ }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/**
 * Bounded drag positioning for floating utilities (Compose mini-player).
 * Stores position in sessionStorage; re-clamps on resize / keyboard.
 */
export function useFloatingPosition({
  storageKey,
  elementRef,
  defaultInset = { right: 12, bottom: 10 },
  getViewportInsets,
  enabled = true,
}: UseFloatingPositionOptions) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const getInsets = useCallback(() => {
    const base = getViewportInsets?.() ?? { top: 8, right: 8, bottom: 8, left: 8 }
    return base
  }, [getViewportInsets])

  const getBounds = useCallback((): FloatingBounds => {
    const el = elementRef.current
    return {
      width: el?.offsetWidth ?? 200,
      height: el?.offsetHeight ?? 52,
    }
  }, [elementRef])

  const defaultPosition = useCallback(() => {
    const { width, height } = getBounds()
    const insets = getInsets()
    const vv = typeof window !== 'undefined'
      ? (window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight, offsetLeft: 0, offsetTop: 0 })
      : { width: 390, height: 844, offsetLeft: 0, offsetTop: 0 }
    const vw = vv.width
    const vh = vv.height
    const x = vw - width - defaultInset.right - insets.right
    const y = vh - height - defaultInset.bottom - insets.bottom
    return {
      x: clamp(x, insets.left, vw - width - insets.right),
      y: clamp(y, insets.top, vh - height - insets.bottom),
    }
  }, [getBounds, getInsets, defaultInset.bottom, defaultInset.right])

  const clampPosition = useCallback((x: number, y: number) => {
    const { width, height } = getBounds()
    const insets = getInsets()
    const vv = typeof window !== 'undefined'
      ? (window.visualViewport ?? { width: window.innerWidth, height: window.innerHeight })
      : { width: 390, height: 844 }
    return {
      x: clamp(x, insets.left, vv.width - width - insets.right),
      y: clamp(y, insets.top, vv.height - height - insets.bottom),
    }
  }, [getBounds, getInsets])

  const resolved = position ?? defaultPosition()

  const reclamp = useCallback(() => {
    setPosition((prev) => {
      const base = prev ?? defaultPosition()
      return clampPosition(base.x, base.y)
    })
  }, [clampPosition, defaultPosition])

  useEffect(() => {
    if (!enabled) return
    const stored = readStored(storageKey)
    if (stored) setPosition(clampPosition(stored.x, stored.y))
  }, [enabled, storageKey, clampPosition])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const vv = window.visualViewport
    const onResize = () => reclamp()
    window.addEventListener('resize', onResize)
    vv?.addEventListener('resize', onResize)
    vv?.addEventListener('scroll', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      vv?.removeEventListener('resize', onResize)
      vv?.removeEventListener('scroll', onResize)
    }
  }, [enabled, reclamp])

  const onPointerDown = useCallback((e: React.PointerEvent, isInteractive: boolean) => {
    if (!enabled || isInteractive) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: resolved.x,
      originY: resolved.y,
    }
  }, [enabled, resolved.x, resolved.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    setPosition(clampPosition(drag.originX + dx, drag.originY + dy))
  }, [clampPosition])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    setPosition((prev) => {
      const next = prev ?? defaultPosition()
      writeStored(storageKey, next)
      return next
    })
  }, [defaultPosition, storageKey])

  const resetPosition = useCallback(() => {
    setPosition(null)
    writeStored(storageKey, null)
  }, [storageKey])

  return {
    x: resolved.x,
    y: resolved.y,
    isCustom: position !== null,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    resetPosition,
    reclamp,
  }
}

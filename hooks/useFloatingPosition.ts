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

const TAP_SLOP_PX = 6

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

function viewportSize() {
  if (typeof window === 'undefined') return { width: 390, height: 844 }
  const vv = window.visualViewport
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  }
}

/**
 * Bounded drag positioning for floating utilities (Compose mini-player).
 * Document-level pointer tracking for 1:1 finger follow; persists in sessionStorage.
 */
export function useFloatingPosition({
  storageKey,
  elementRef,
  defaultInset = { right: 12, bottom: 10 },
  getViewportInsets,
  enabled = true,
}: UseFloatingPositionOptions) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const onTapRef = useRef<(() => void) | null>(null)
  const clampPositionRef = useRef<(x: number, y: number) => { x: number; y: number }>(() => ({ x: 0, y: 0 }))
  const defaultPositionRef = useRef<() => { x: number; y: number }>(() => ({ x: 0, y: 0 }))
  const cleanupDragRef = useRef<(() => void) | null>(null)

  const getInsets = useCallback(() => {
    return getViewportInsets?.() ?? { top: 8, right: 8, bottom: 8, left: 8 }
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
    const { width: vw, height: vh } = viewportSize()
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
    const { width: vw, height: vh } = viewportSize()
    return {
      x: clamp(x, insets.left, vw - width - insets.right),
      y: clamp(y, insets.top, vh - height - insets.bottom),
    }
  }, [getBounds, getInsets])

  defaultPositionRef.current = defaultPosition
  clampPositionRef.current = clampPosition

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

  useEffect(() => () => {
    cleanupDragRef.current?.()
    cleanupDragRef.current = null
  }, [])

  const endDrag = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== pointerId) return

    const dx = clientX - drag.startX
    const dy = clientY - drag.startY
    const moved = drag.moved || Math.abs(dx) > TAP_SLOP_PX || Math.abs(dy) > TAP_SLOP_PX
    dragRef.current = null
    setIsDragging(false)
    cleanupDragRef.current?.()
    cleanupDragRef.current = null

    if (moved) {
      setPosition((prev) => {
        const next = prev ?? defaultPositionRef.current()
        writeStored(storageKey, next)
        return next
      })
      return
    }
    onTapRef.current?.()
  }, [storageKey])

  const onPointerDown = useCallback((e: React.PointerEvent, isInteractive: boolean) => {
    if (!enabled || isInteractive) return
    e.preventDefault()

    const pointerId = e.pointerId
    dragRef.current = {
      pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: resolved.x,
      originY: resolved.y,
      moved: false,
    }
    setIsDragging(false)

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== ev.pointerId) return
      const dx = ev.clientX - drag.startX
      const dy = ev.clientY - drag.startY
      if (!drag.moved && (Math.abs(dx) > 0 || Math.abs(dy) > 0)) {
        drag.moved = true
        setIsDragging(true)
      }
      if (!drag.moved) return
      ev.preventDefault()
      setPosition(clampPositionRef.current(drag.originX + dx, drag.originY + dy))
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      endDrag(pointerId, ev.clientX, ev.clientY)
    }

    cleanupDragRef.current?.()
    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    cleanupDragRef.current = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [enabled, endDrag, resolved.x, resolved.y])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (!drag.moved && (Math.abs(dx) > 0 || Math.abs(dy) > 0)) {
      drag.moved = true
      setIsDragging(true)
    }
    if (!drag.moved) return
    e.preventDefault()
    setPosition(clampPosition(drag.originX + dx, drag.originY + dy))
  }, [clampPosition])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    endDrag(e.pointerId, e.clientX, e.clientY)
  }, [endDrag])

  const onPointerCancel = useCallback((e: React.PointerEvent) => {
    endDrag(e.pointerId, e.clientX, e.clientY)
  }, [endDrag])

  const setOnTap = useCallback((fn: (() => void) | null) => {
    onTapRef.current = fn
  }, [])

  return {
    x: resolved.x,
    y: resolved.y,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    setOnTap,
    reclamp,
  }
}

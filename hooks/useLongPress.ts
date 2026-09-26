'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MARGO_CONTEXT_LONG_PRESS_MS,
  MARGO_LONG_PRESS_MOVE_PX,
  margoContextHaptic,
} from '@/lib/margo-gestures'

export type UseLongPressOptions = {
  /** Hold duration before `onLongPress`. */
  ms?: number
  moveThresholdPx?: number
  disabled?: boolean
  /** Fire haptic on success (context gestures). */
  haptic?: boolean
  onLongPress: () => void
  onPressStart?: () => void
  onPressEnd?: () => void
}

/**
 * Pointer long-press with movement cancel — shared by Compose combine and Margo action sheets.
 * Call `consumeClick()` inside click handlers to suppress the synthetic click after a long-press.
 */
export function useLongPress({
  ms = MARGO_CONTEXT_LONG_PRESS_MS,
  moveThresholdPx = MARGO_LONG_PRESS_MOVE_PX,
  disabled = false,
  haptic = true,
  onLongPress,
  onPressStart,
  onPressEnd,
}: UseLongPressOptions) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const pressStartedAt = useRef(0)
  const longPressTriggered = useRef(false)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)
  const [pressing, setPressing] = useState(false)
  const [progress, setProgress] = useState(0)

  const clearTimers = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
    }
    pressOrigin.current = null
    setPressing(false)
    setProgress(0)
    onPressEnd?.()
  }, [onPressEnd])

  useEffect(() => () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    if (progressTimer.current) clearInterval(progressTimer.current)
  }, [])

  const consumeClick = useCallback(() => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return true
    }
    return false
  }, [])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (disabled) return
    longPressTriggered.current = false
    clearTimers()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* best-effort */
    }
    pressOrigin.current = { x: event.clientX, y: event.clientY }
    pressStartedAt.current = Date.now()
    setPressing(true)
    setProgress(0)
    onPressStart?.()

    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - pressStartedAt.current
      setProgress(Math.min(1, elapsed / ms))
    }, 32)

    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      if (progressTimer.current) {
        clearInterval(progressTimer.current)
        progressTimer.current = null
      }
      longPressTriggered.current = true
      setProgress(1)
      if (haptic) margoContextHaptic()
      onLongPress()
      setPressing(false)
    }, ms)
  }, [clearTimers, disabled, haptic, ms, onLongPress, onPressStart])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!pressOrigin.current || !pressTimer.current) return
    const dx = event.clientX - pressOrigin.current.x
    const dy = event.clientY - pressOrigin.current.y
    if ((dx * dx + dy * dy) > moveThresholdPx * moveThresholdPx) {
      clearTimers()
    }
  }, [clearTimers, moveThresholdPx])

  const onPointerUp = useCallback(() => {
    clearTimers()
  }, [clearTimers])

  const onPointerCancel = useCallback(() => {
    clearTimers()
  }, [clearTimers])

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
  }, [])

  return {
    pressing,
    progress,
    consumeClick,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
    },
  }
}

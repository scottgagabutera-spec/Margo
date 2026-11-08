'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Immediate tap acknowledgement: paints a pressed/gold state on pointerdown
 * (before click or any route commit) and holds it briefly, so a tap never
 * looks dead and a second tap reads as already-handled.
 */
export function useTapAck(holdMs = 700) {
  const [ackedKey, setAckedKey] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const ack = useCallback(
    (key = 'tap') => {
      setAckedKey(key)
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setAckedKey(null), holdMs)
    },
    [holdMs],
  )

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    },
    [],
  )

  const isAcked = useCallback((key = 'tap') => ackedKey === key, [ackedKey])

  return { ack, isAcked, ackedKey }
}

'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { searchDropdownMaxHeightBelowPx } from '@/lib/search-viewport-layout'
import { attachSettledVisualViewportListener } from '@/lib/settled-visual-viewport'
import { useVisualViewport } from '@/hooks/useVisualViewport'

/** Max height for a scroll region or dropdown below a search anchor (keyboard-aware). */
export function useSearchBelowMaxHeight(
  anchorRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const metrics = useVisualViewport({ publishCssVars: enabled })
  const [maxHeight, setMaxHeight] = useState<number | null>(null)
  const lastHeightRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!enabled) {
      setMaxHeight(null)
      lastHeightRef.current = null
      return
    }
    const el = anchorRef.current
    if (!el) return

    const compute = (offsetTop: number, height: number) => {
      const rect = el.getBoundingClientRect()
      // With the keyboard up the visual viewport already ends above it and
      // the tab bar is hidden; without it, reserve the real bottom chrome.
      const pageBottom = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--margo-page-bottom'),
      )
      const bottomInset = metrics.keyboardOpen ? 8 : Number.isFinite(pageBottom) ? pageBottom : 0
      return searchDropdownMaxHeightBelowPx({
        anchorBottom: rect.bottom,
        offsetTop,
        viewportHeight: height,
        gap: 8,
        bottomInset,
      })
    }

    const detach = attachSettledVisualViewportListener({
      onSettled: (snap) => {
        const next = compute(snap.offsetTop, snap.height)
        const prev = lastHeightRef.current
        if (prev != null && Math.abs(next - prev) < 2) return
        lastHeightRef.current = next
        setMaxHeight(next)
      },
    })

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      const snap = { offsetTop: metrics.offsetTop, height: metrics.height }
      const next = compute(snap.offsetTop, snap.height)
      lastHeightRef.current = next
      setMaxHeight(next)
    }) : null
    ro?.observe(el)

    return () => {
      detach()
      ro?.disconnect()
    }
  }, [enabled, anchorRef, metrics.height, metrics.offsetTop, metrics.keyboardOpen])

  return maxHeight
}

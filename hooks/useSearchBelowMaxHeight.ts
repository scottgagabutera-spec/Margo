'use client'

import { useLayoutEffect, useState } from 'react'
import { searchDropdownMaxHeightBelowPx } from '@/lib/search-viewport-layout'
import { useVisualViewport } from '@/hooks/useVisualViewport'

/** Max height for a scroll region or dropdown below a search anchor (keyboard-aware). */
export function useSearchBelowMaxHeight(
  anchorRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const metrics = useVisualViewport({ publishCssVars: enabled })
  const [maxHeight, setMaxHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!enabled) {
      setMaxHeight(null)
      return
    }
    const el = anchorRef.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      const vv = window.visualViewport
      const offsetTop = vv?.offsetTop ?? 0
      const height = vv?.height ?? window.innerHeight
      setMaxHeight(
        searchDropdownMaxHeightBelowPx({
          anchorBottom: rect.bottom,
          offsetTop,
          viewportHeight: height,
          gap: 8,
        }),
      )
    }

    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled, anchorRef, metrics.height, metrics.offsetTop])

  return maxHeight
}

'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { persistDiscoverDepth, clearDiscoverDepth, isDiscoverInnerPath } from '@/lib/margo-discover-depth'
import { useMargoExactScroll } from '@/hooks/useMargoExactScroll'
import type { MargoPageResumeEntry } from '@/lib/margo-page-resume'
import { clearPageResume } from '@/lib/margo-page-resume'
import { consumeSearchUnderlayRestore } from '@/lib/margo-search-underlay'
import { useEffect, useLayoutEffect, useRef } from 'react'

export type UseMargoPageResumeOptions = {
  pageKey: string
  enabled?: boolean
  readExtra?: () => Partial<Pick<MargoPageResumeEntry, 'n' | 'tab'>>
  onResume?: (entry: MargoPageResumeEntry) => void
  getScrollTop?: () => number
  setScrollTop?: (y: number) => void
  scroller?: 'window' | 'element'
  getScroller?: () => HTMLElement | null
}

/**
 * Save vertical scroll continuously; restore exactly on remount — no fetch.
 */
export function useMargoPageResume(options: UseMargoPageResumeOptions) {
  const {
    pageKey,
    enabled = true,
    readExtra,
    onResume,
    getScrollTop,
    setScrollTop,
    scroller = 'window',
    getScroller,
  } = options
  const pathname = usePathname()
  const underlayRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!enabled) return
    const y = consumeSearchUnderlayRestore(pathname ?? '')
  if (y != null) underlayRef.current = y
  }, [enabled, pathname])

  useMargoExactScroll({
    pageKey,
    enabled,
    scroller,
    getScroller,
    readExtra,
    onResumeEntry: (entry) => {
      if (underlayRef.current != null) {
        onResume?.({ ...entry, y: underlayRef.current })
        underlayRef.current = null
      } else {
        onResume?.(entry)
      }
      if (getScrollTop && setScrollTop && entry.y > 0) {
        setScrollTop(entry.y)
      }
    },
  })

  useEffect(() => {
    if (!enabled) return
    const path = (pathname ?? '').split('?')[0]
    if (isDiscoverInnerPath(path)) {
      persistDiscoverDepth(path)
    } else if (path === '/discover') {
      clearDiscoverDepth()
    }
  }, [enabled, pathname])

  const persist = useCallback(() => {
    /* handled by useMargoExactScroll */
  }, [])

  return {
    clearResume: () => clearPageResume(pageKey),
    persistNow: persist,
  }
}

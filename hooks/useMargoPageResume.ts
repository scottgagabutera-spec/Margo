'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  readPageResume,
  writePageResume,
  clearPageResume,
  type MargoPageResumeEntry,
} from '@/lib/margo-page-resume'
import { consumeSearchUnderlayRestore } from '@/lib/margo-search-underlay'
import { persistDiscoverDepth, clearDiscoverDepth, isDiscoverInnerPath } from '@/lib/margo-discover-depth'

export type UseMargoPageResumeOptions = {
  pageKey: string
  enabled?: boolean
  /** Read extra fields (e.g. visible batch count). */
  readExtra?: () => Partial<Pick<MargoPageResumeEntry, 'n' | 'tab'>>
  /** Called once after first paint when resume exists. */
  onResume?: (entry: MargoPageResumeEntry) => void
  getScrollTop?: () => number
  setScrollTop?: (y: number) => void
}

function defaultGetScrollTop() {
  if (typeof window === 'undefined') return 0
  return window.scrollY || document.documentElement.scrollTop || 0
}

function defaultSetScrollTop(y: number) {
  if (typeof window === 'undefined') return
  window.scrollTo({ top: y, behavior: 'auto' })
}

/**
 * Save vertical scroll (and tiny extras) for a route. Restore on remount — no fetch.
 */
export function useMargoPageResume(options: UseMargoPageResumeOptions) {
  const {
    pageKey,
    enabled = true,
    readExtra,
    onResume,
    getScrollTop = defaultGetScrollTop,
    setScrollTop = defaultSetScrollTop,
  } = options
  const pathname = usePathname()
  const restoredRef = useRef(false)
  const saveRafRef = useRef(0)

  const persist = useCallback(() => {
    if (!enabled) return
    const extra = readExtra?.() ?? {}
    writePageResume(pageKey, {
      y: getScrollTop(),
      ...extra,
    })
  }, [enabled, pageKey, readExtra, getScrollTop])

  useLayoutEffect(() => {
    if (!enabled || restoredRef.current) return
    const underlayY = consumeSearchUnderlayRestore(pathname)
    const entry = readPageResume(pageKey)
    const y = underlayY ?? entry?.y
    if (y != null && y > 0) {
      setScrollTop(y)
    }
    if (entry) {
      onResume?.(entry)
    } else if (underlayY != null) {
      onResume?.({ y: underlayY, at: Date.now() })
    }
    restoredRef.current = true
  }, [enabled, pageKey, pathname, onResume, setScrollTop])

  useEffect(() => {
    if (!enabled) return
    const path = pathname.split('?')[0]
    if (isDiscoverInnerPath(path)) {
      persistDiscoverDepth(path)
    } else if (path === '/discover') {
      clearDiscoverDepth()
    }
    const onScroll = () => {
      if (saveRafRef.current) return
      saveRafRef.current = window.requestAnimationFrame(() => {
        saveRafRef.current = 0
        persist()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (saveRafRef.current) window.cancelAnimationFrame(saveRafRef.current)
      persist()
    }
  }, [enabled, pathname, persist])

  return {
    clearResume: () => clearPageResume(pageKey),
    persistNow: persist,
  }
}

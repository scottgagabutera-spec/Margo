'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { writeScrollLive, readScrollLive, flushScrollLive } from '@/lib/margo-scroll-live'
import type { MargoPageResumeEntry } from '@/lib/margo-page-resume'
import { restoreExactWindowScroll } from '@/lib/margo-exact-scroll-restore'

export type UseMargoExactScrollOptions = {
  pageKey: string
  enabled?: boolean
  scroller?: 'window' | 'element'
  getScroller?: () => HTMLElement | null
  readExtra?: () => Partial<Pick<MargoPageResumeEntry, 'n' | 'tab'>>
  onResumeEntry?: (entry: MargoPageResumeEntry) => void
}

function readWindowY() {
  return window.scrollY || document.documentElement.scrollTop || 0
}

/**
 * Continuous scroll capture (rAF-throttled) + exact restore with bounded height wait.
 */
export function useMargoExactScroll(opts: UseMargoExactScrollOptions) {
  const {
    pageKey,
    enabled = true,
    scroller = 'window',
    getScroller,
    readExtra,
    onResumeEntry,
  } = opts
  const restoredRef = useRef(false)
  const saveRafRef = useRef(0)

  const persist = useCallback(() => {
    if (!enabled) return
    const y =
      scroller === 'element' && getScroller
        ? (getScroller()?.scrollTop ?? 0)
        : readWindowY()
    writeScrollLive(pageKey, { y, ...(readExtra?.() ?? {}) })
  }, [enabled, pageKey, scroller, getScroller, readExtra])

  useLayoutEffect(() => {
    if (!enabled || restoredRef.current) return
    const entry = readScrollLive(pageKey)
    if (entry) {
      onResumeEntry?.(entry)
      if (entry.y > 0) {
        if (scroller === 'element' && getScroller) {
          const el = getScroller()
          if (el) el.scrollTop = entry.y
        } else {
          restoreExactWindowScroll(entry.y)
        }
      }
    }
    restoredRef.current = true
  }, [enabled, pageKey, scroller, getScroller, onResumeEntry])

  useEffect(() => {
    if (!enabled) return
    const target =
      scroller === 'element' && getScroller ? getScroller() : (typeof window !== 'undefined' ? window : null)
    if (!target) return
    const onScroll = () => {
      if (saveRafRef.current) return
      saveRafRef.current = window.requestAnimationFrame(() => {
        saveRafRef.current = 0
        persist()
      })
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    const onHide = () => flushScrollLive(pageKey)
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushScrollLive(pageKey)
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVis)
      if (saveRafRef.current) window.cancelAnimationFrame(saveRafRef.current)
      flushScrollLive(pageKey)
    }
  }, [enabled, pageKey, persist, scroller, getScroller])

  return { persistNow: persist }
}

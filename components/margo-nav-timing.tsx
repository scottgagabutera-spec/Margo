'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { MARGO_NAV_START } from '@/lib/margo-nav-intent'
import { readFeedReturnSnapshot } from '@/lib/margo-feed-return'
import { trackNavMetric } from '@/lib/analytics/track'

/**
 * Navigation timing marks tied to MARGO_NAV_START. Analytics only.
 */
export function MargoNavTiming() {
  const pathname = usePathname()
  const navStartRef = useRef(0)
  const pendingNavRef = useRef(false)

  useEffect(() => {
    const onStart = () => {
      navStartRef.current = performance.now()
      pendingNavRef.current = true
    }
    window.addEventListener(MARGO_NAV_START, onStart)
    return () => window.removeEventListener(MARGO_NAV_START, onStart)
  }, [])

  useEffect(() => {
    if (!pendingNavRef.current) return
    const ms = Math.round(performance.now() - navStartRef.current)
    pendingNavRef.current = false
    trackNavMetric('tab_switch_ms', ms)
  }, [pathname])

  useEffect(() => {
    const onPop = () => {
      let pending = false
      try {
        pending = sessionStorage.getItem('margo-feed-return-pending') === '1'
      } catch {
        pending = false
      }
      if (!pending) return
      const snap = readFeedReturnSnapshot()
      if (!snap) return
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const scroller = document.querySelector('[data-margo-primary-tab="feed"]')
          const y = scroller instanceof HTMLElement ? scroller.scrollTop : 0
          const ok = Math.abs(y - snap.y) <= 12 ? 1 : 0
          trackNavMetric('return_ok', ok)
        })
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return null
}

'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { measureMargoHeaderBottom } from '@/lib/margo-header-band'

/** Publishes --margo-header-h and --margo-header-bottom from the real header band. */
export function MargoChromeInsetsPublisher() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const { bottom, height } = measureMargoHeaderBottom()
      root.style.setProperty('--margo-header-h', `${Math.round(height)}px`)
      root.style.setProperty('--margo-header-bottom', `${Math.round(bottom)}px`)
    }

    apply()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    const path = (pathname || '/').split('?')[0]
    const el = document.querySelector(path === '/' ? '.margo-landing-nav' : '.margo-nav-bar')
    if (el) ro?.observe(el)
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('resize', apply)
    }
  }, [pathname])

  return null
}

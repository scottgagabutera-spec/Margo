'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { measureMargoHeaderBottom } from '@/lib/margo-header-band'

/** Publishes --margo-header-h and --margo-header-bottom from the real header band element. */
export function MargoChromeInsetsPublisher() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const { bottom, height, source } = measureMargoHeaderBottom()
      root.style.setProperty('--margo-header-h', `${Math.round(height)}px`)
      root.style.setProperty('--margo-header-bottom', `${Math.round(bottom)}px`)
      root.setAttribute('data-margo-header-source', source)
    }

    apply()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    const path = (pathname || '/').split('?')[0]
    const el = document.querySelector(path === '/' ? '.margo-landing-nav' : '.margo-nav-bar')
    if (el) ro?.observe(el)
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('scroll', apply)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('scroll', apply)
    }
  }, [pathname])

  return null
}

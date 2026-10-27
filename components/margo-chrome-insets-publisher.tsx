'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Publishes --margo-header-h (header band including safe-area) for layout math. */
export function MargoChromeInsetsPublisher() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const path = (pathname || '/').split('?')[0]
      if (path === '/') {
        const nav = document.querySelector('.margo-landing-nav') as HTMLElement | null
        const h = nav?.offsetHeight ?? 68
        root.style.setProperty('--margo-header-h', `${h}px`)
        return
      }
      const navH = parseFloat(getComputedStyle(root).getPropertyValue('--nav-height'))
      root.style.setProperty('--margo-header-h', `${Number.isFinite(navH) && navH > 0 ? navH : 72}px`)
    }

    apply()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    const path = (pathname || '/').split('?')[0]
    const el = document.querySelector(path === '/' ? '.margo-landing-nav' : '.margo-nav-bar')
    if (el) ro?.observe(el)
    window.addEventListener('resize', apply)
    const mo = new MutationObserver(apply)
    mo.observe(root, { attributes: true, attributeFilter: ['style'] })
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', apply)
      mo.disconnect()
    }
  }, [pathname])

  return null
}

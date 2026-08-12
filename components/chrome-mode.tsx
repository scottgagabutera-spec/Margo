'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { chromeModeForPath } from '@/lib/chrome-mode'

/** Publishes `html[data-margo-chrome]` from the current route. */
export function ChromeModePublisher() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const mode = chromeModeForPath(pathname)
    document.documentElement.setAttribute('data-margo-chrome', mode)
  }, [pathname])

  return null
}

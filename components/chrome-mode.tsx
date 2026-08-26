'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { chromeModeForPath, isMessageThreadPath } from '@/lib/chrome-mode'

/** Publishes `html[data-margo-chrome]` from the current route. */
export function ChromeModePublisher() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const mode = chromeModeForPath(pathname)
    document.documentElement.setAttribute('data-margo-chrome', mode)
    if (isMessageThreadPath(pathname)) {
      document.documentElement.setAttribute('data-margo-conversation-thread', '1')
    } else {
      document.documentElement.removeAttribute('data-margo-conversation-thread')
    }
  }, [pathname])

  return null
}

'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { chromeModeForPath, isMessageThreadPath } from '@/lib/chrome-mode'
import { isHubSheetFlushTopPath } from '@/lib/hub-overlay-surfaces'

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
    if (isHubSheetFlushTopPath(pathname)) {
      document.documentElement.setAttribute('data-margo-hub-sheet-flush-top', '1')
    } else {
      document.documentElement.removeAttribute('data-margo-hub-sheet-flush-top')
    }
  }, [pathname])

  return null
}

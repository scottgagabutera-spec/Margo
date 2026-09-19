'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { consumeAuthReturnScroll } from '@/lib/auth-return'
import { scrollActiveTo } from '@/components/primary-tab-shell'

/**
 * After OAuth / full-page /signin, restore the pane scroll we saved
 * when the user left for auth.
 */
export function AuthReturnRestorer() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname === '/signin') return
    const qs = searchParams.toString()
    const here = qs ? `${pathname}?${qs}` : pathname
    const y = consumeAuthReturnScroll(here)
    if (y == null || y <= 0) return
    const apply = () => scrollActiveTo(y)
    apply()
    const t = window.setTimeout(apply, 80)
    return () => window.clearTimeout(t)
  }, [pathname, searchParams])

  return null
}

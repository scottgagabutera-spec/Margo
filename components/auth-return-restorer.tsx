'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { restoreAuthReturnScroll } from '@/lib/auth-return'

/**
 * After auth completes, re-apply scroll for the saved return path (Instagram / Spotify pattern).
 */
export function AuthReturnRestorer() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, loading } = useAuthGate()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading || !user) return
    const path = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    if (path === lastPathRef.current) return
    lastPathRef.current = path

    const timer = window.setTimeout(() => {
      restoreAuthReturnScroll(path)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loading, user, pathname, searchParams])

  return null
}

'use client'

import { capturePostHogPageView, initPostHogBrowser, isPostHogConfigured } from '@/lib/analytics/posthog-browser'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, type ReactNode } from 'react'

function PostHogPageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHogBrowser()
  }, [])

  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return
    const qs = searchParams?.toString()
    const url = window.location.origin + pathname + (qs ? `?${qs}` : '')
    capturePostHogPageView(url)
  }, [pathname, searchParams])

  return null
}

/**
 * Optional PostHog bootstrap + manual pageviews. Renders children unchanged when env is unset.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  if (!isPostHogConfigured()) {
    return <>{children}</>
  }

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageViewTracker />
      </Suspense>
      {children}
    </>
  )
}

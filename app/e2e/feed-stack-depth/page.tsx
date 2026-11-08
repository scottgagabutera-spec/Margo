'use client'

import { useRegisterNavBack } from '@/components/nav-back'

/** Shallow stack target for Playwright feed-return tests (non-production). */
export default function E2eFeedStackDepthPage() {
  useRegisterNavBack({ preferHistory: true, fallbackHref: '/feed?e2eShorts=1&e2eFeedReturn=1' })
  return (
    <main style={{ padding: 24, minHeight: '40vh' }}>
      <p>E2E feed stack depth</p>
    </main>
  )
}

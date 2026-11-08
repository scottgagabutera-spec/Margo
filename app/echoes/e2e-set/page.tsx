'use client'

import { useRegisterNavBack } from '@/components/nav-back'

export default function EchoesE2eSetPage() {
  useRegisterNavBack({ preferHistory: true, fallbackHref: '/feed?e2eShorts=1&e2eFeedReturn=1&tab=lyrics' })
  return (
    <main style={{ padding: 24, minHeight: '40vh' }}>
      <p>E2E Echoes set</p>
    </main>
  )
}

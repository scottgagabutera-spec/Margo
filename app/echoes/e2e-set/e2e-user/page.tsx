'use client'

import { useRegisterNavBack } from '@/components/nav-back'

export default function EchoesE2ePersonPage() {
  useRegisterNavBack({ preferHistory: true, fallbackHref: '/echoes/e2e-set' })
  return (
    <main style={{ padding: 24, minHeight: '40vh' }}>
      <p>E2E Echoes person</p>
    </main>
  )
}

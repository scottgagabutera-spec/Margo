'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

const LayoutDebugOverlay = dynamic(() => import('@/components/layout-debug-overlay'), { ssr: false })

export function LayoutDebugGate() {
  const sp = useSearchParams()
  if (sp.get('layoutdebug') !== '1') return null
  return <LayoutDebugOverlay />
}

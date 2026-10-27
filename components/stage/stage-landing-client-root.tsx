'use client'

import { useLayoutEffect } from 'react'
import { StageLanding } from '@/components/stage/stage-landing'

/** Hydrates interactive Stage search/moment UI; hides the SSR hero shell once ready. */
export function StageLandingClientRoot() {
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-margo-stage-client-ready', '1')
    return () => document.documentElement.removeAttribute('data-margo-stage-client-ready')
  }, [])

  return (
    <div className="margo-stage-client-root">
      <StageLanding />
    </div>
  )
}

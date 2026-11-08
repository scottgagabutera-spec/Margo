'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { MomentShapeId } from '@/lib/moment/types'
import {
  landingComposerTier,
  landingPreviewFrameSize,
  type LandingComposerTier,
} from '@/lib/landing-composer-layout'

export function LandingComposerPreviewFrame({
  shapeId,
  children,
  empty,
}: {
  shapeId: MomentShapeId
  children: ReactNode
  empty: boolean
}) {
  const [tier, setTier] = useState<LandingComposerTier>('phone')
  useEffect(() => {
    const read = () => setTier(landingComposerTier(window.innerWidth))
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  const { width, height } = landingPreviewFrameSize(shapeId, tier)
  return (
    <div
      className="margo-landing-preview-frame"
      data-shape={shapeId}
      data-tier={tier}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <div className="margo-landing-preview-frame__inner">
        {empty ? <div className="margo-landing-preview-ghost" aria-hidden /> : children}
      </div>
    </div>
  )
}

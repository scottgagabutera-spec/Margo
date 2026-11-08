import type { MomentShapeId } from '@/lib/moment/types'

export type LandingComposerTier = 'phone' | 'tablet' | 'desktop'

export function landingComposerTier(width: number): LandingComposerTier {
  if (width >= 1024) return 'desktop'
  if (width >= 640) return 'tablet'
  return 'phone'
}

/** Preview frame sizes (px) — export paths stay 1080×1080 / 1080×1920. */
export function landingPreviewFrameSize(
  shapeId: MomentShapeId,
  tier: LandingComposerTier,
): { width: number; height: number } {
  if (shapeId === 'vertical') {
    if (tier === 'desktop') return { width: 292, height: 520 }
    if (tier === 'tablet') return { width: 304, height: 540 }
    return { width: 236, height: 420 }
  }
  if (tier === 'desktop') return { width: 400, height: 400 }
  if (tier === 'tablet') return { width: 480, height: 480 }
  return { width: 328, height: 328 }
}

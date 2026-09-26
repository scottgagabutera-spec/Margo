import type { MomentShapeId } from '@/lib/moment/types'

/** One line under export size picker — where auto-promote applies vs manual export. */
export function exportShapePromoteHint(shapeId: MomentShapeId): string {
  if (shapeId === 'vertical') {
    return 'Shorts (9:16) is for YouTube and TikTok auto-promote. Export and Share work at every size.'
  }
  if (shapeId === 'square') {
    return 'Feed (1:1) is great for Instagram-style posts. Use Export or Share, or switch to Shorts for auto-promote.'
  }
  return 'Wide (16:9) suits YouTube landscape and Facebook. Use Export or Share, or switch to Shorts for Shorts-style auto-promote.'
}

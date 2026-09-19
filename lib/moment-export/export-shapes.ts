import type { MomentShapeId } from '@/lib/moment/types'
import { STAGE_CARD_EXPORT_WIDTH } from '@/lib/moment-export/layout/constants'

/** User-facing export sizes cycled in share/export UI. */
export const EXPORT_SHAPE_CYCLE: MomentShapeId[] = ['square', 'vertical']

export const EXPORT_SHAPE_LABELS: Record<MomentShapeId, string> = {
  square: 'Feed',
  /** 9:16 vertical for Shorts / Reels / Stories / TikTok — not Story-only. */
  vertical: 'Shorts',
  wide: 'Wide',
}

export const EXPORT_SHAPE_HINTS: Record<MomentShapeId, string> = {
  square: '1:1',
  vertical: '9:16',
  wide: '16:9',
}

/** Card width as a fraction of the 9:16 canvas — preview and file share this. */
export const VERTICAL_CARD_WIDTH_FRACTION = 0.88

export function verticalStageCardWidth(canvasWidth = STAGE_CARD_EXPORT_WIDTH): number {
  return Math.round(canvasWidth * VERTICAL_CARD_WIDTH_FRACTION)
}

export function cycleExportShape(id: MomentShapeId): MomentShapeId {
  const idx = EXPORT_SHAPE_CYCLE.indexOf(id)
  if (idx < 0) return EXPORT_SHAPE_CYCLE[0]
  return EXPORT_SHAPE_CYCLE[(idx + 1) % EXPORT_SHAPE_CYCLE.length]
}

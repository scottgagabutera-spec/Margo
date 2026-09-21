import type { MomentShapeId } from '@/lib/moment/types'

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

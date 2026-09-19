import type { MomentShapeId } from '@/lib/moment/types'

/** User-facing export sizes cycled in share/export UI. */
export const EXPORT_SHAPE_CYCLE: MomentShapeId[] = ['square', 'vertical']

export const EXPORT_SHAPE_LABELS: Record<MomentShapeId, string> = {
  square: 'Feed',
  vertical: 'Story',
  wide: 'Wide',
}

export function cycleExportShape(id: MomentShapeId): MomentShapeId {
  const idx = EXPORT_SHAPE_CYCLE.indexOf(id)
  if (idx < 0) return EXPORT_SHAPE_CYCLE[0]
  return EXPORT_SHAPE_CYCLE[(idx + 1) % EXPORT_SHAPE_CYCLE.length]
}

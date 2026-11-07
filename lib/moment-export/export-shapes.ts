import type { MomentShapeId } from '@/lib/moment/types'

/** User-facing export sizes cycled in share/export UI. */
/** Wide removed from export UI — legacy DB values may still read as `wide`. */
export const EXPORT_SHAPE_CYCLE: MomentShapeId[] = ['square', 'vertical']

export const EXPORT_SHAPE_LABELS: Record<MomentShapeId, string> = {
  square: 'Square',
  vertical: 'Story',
  wide: 'Wide',
}

export const EXPORT_SHAPE_HINTS: Record<MomentShapeId, string> = {
  square: '1:1',
  vertical: '9:16',
  wide: '16:9',
}

import type { MomentShapeId } from '@/lib/moment/types'

/** Must stay aligned with {@link SHAPES} in render-moment.ts */
const MOMENT_PNG_OUTPUT_PX: Record<MomentShapeId, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  wide: { width: 1600, height: 900 },
}

/** Final PNG width/height after supersample render and downscale. */
export function momentPngOutputPixelSize(shapeId: MomentShapeId): { width: number; height: number } {
  return MOMENT_PNG_OUTPUT_PX[shapeId] ?? MOMENT_PNG_OUTPUT_PX.square
}

export function momentPngOutputWidthHeight(shapeId: MomentShapeId): { w: number; h: number } {
  const { width, height } = momentPngOutputPixelSize(shapeId)
  return { w: width, h: height }
}

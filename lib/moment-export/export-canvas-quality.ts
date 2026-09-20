import { STAGE_CARD_EXPORT_SCALE } from '@/lib/moment-export/layout/constants'

export { STAGE_CARD_EXPORT_SCALE }

export function applyExportCanvasQuality(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

/** Bind a canvas for stage-card export at logical layout size × supersampling scale. */
export function bindStageExportCanvas(
  canvas: HTMLCanvasElement,
  layoutWidth: number,
  layoutHeight: number,
  scale = STAGE_CARD_EXPORT_SCALE,
): CanvasRenderingContext2D {
  canvas.width = Math.round(layoutWidth * scale)
  canvas.height = Math.round(layoutHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(scale, scale)
  applyExportCanvasQuality(ctx)
  return ctx
}

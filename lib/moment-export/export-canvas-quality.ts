import { STAGE_CARD_EXPORT_SCALE } from '@/lib/moment-export/layout/constants'

export { STAGE_CARD_EXPORT_SCALE }

/** H.264 encoders (WebCodecs) typically cap at 4096px per side. */
export const VIDEO_ENCODER_MAX_DIMENSION = 4096

export function applyExportCanvasQuality(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

/**
 * Supersampling scale for video — never exceed encoder dimension limits.
 * Shorts at 1920px logical × 3 would hit 5760px and fail H.264 encode.
 */
export function stageVideoExportScale(layoutWidth: number, layoutHeight: number): number {
  const logicalMax = Math.max(layoutWidth, layoutHeight)
  const cap = Math.floor(VIDEO_ENCODER_MAX_DIMENSION / logicalMax)
  return Math.min(STAGE_CARD_EXPORT_SCALE, Math.max(1, cap))
}

/** Bind a canvas for stage-card PNG export at logical layout size × supersampling scale. */
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

/**
 * Bind a canvas for MP4 frame encode. Uses 1:1 logical pixels because
 * renderMomentFrame resets the context transform each frame.
 */
export function bindStageVideoExportCanvas(
  canvas: HTMLCanvasElement,
  layoutWidth: number,
  layoutHeight: number,
): CanvasRenderingContext2D {
  canvas.width = layoutWidth
  canvas.height = layoutHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  applyExportCanvasQuality(ctx)
  return ctx
}

/** Hi-res Shorts render target — layout-native pixels (e.g. 2160×3840). */
export function bindStageVideoRenderCanvas(
  canvas: HTMLCanvasElement,
  layoutWidth: number,
  layoutHeight: number,
): CanvasRenderingContext2D {
  return bindStageVideoExportCanvas(canvas, layoutWidth, layoutHeight)
}

/** Downscale a supersampled render frame onto the encode canvas (1080×1920). */
export function downscaleVideoFrameToEncodeCanvas(
  renderCanvas: HTMLCanvasElement,
  encodeCtx: CanvasRenderingContext2D,
  encodeWidth: number,
  encodeHeight: number,
): void {
  encodeCtx.setTransform(1, 0, 0, 1, 0, 0)
  encodeCtx.clearRect(0, 0, encodeWidth, encodeHeight)
  encodeCtx.drawImage(renderCanvas, 0, 0, encodeWidth, encodeHeight)
}

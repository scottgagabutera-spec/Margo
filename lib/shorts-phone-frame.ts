/** Matches MomentExportPreviewFrame phone cap (main / Margo Shorts). */
export const PHONE_SHORTS_CANVAS_CAP_PX = 320

export function phoneShortsCanvasWidthPx(viewportWidth: number): number {
  return Math.min(PHONE_SHORTS_CANVAS_CAP_PX, viewportWidth)
}

export function phoneShortsCanvasHeightPx(canvasWidth: number): number {
  return (canvasWidth * 16) / 9
}

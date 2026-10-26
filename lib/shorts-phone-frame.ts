/** Phone Shorts canvas width helper (matches computeShortsPhoneFrameLayout). */
import { SHORTS_PHONE_WIDTH_MARGIN } from './shorts-frame-layout.ts'

export const PHONE_SHORTS_CANVAS_CAP_PX = 320

export function phoneShortsCanvasWidthPx(viewportWidth: number): number {
  return Math.max(160, viewportWidth - SHORTS_PHONE_WIDTH_MARGIN)
}

export function phoneShortsCanvasHeightPx(
  canvasWidth: number,
  scrollAreaHeightPx?: number,
): number {
  if (scrollAreaHeightPx != null) {
    return Math.max(160, scrollAreaHeightPx - 28)
  }
  return (canvasWidth * 16) / 9
}

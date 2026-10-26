/** Desktop Shorts (≥640px) 9:16 frame sizing — phone uses main CSS only. */

export type ShortsFrameLayout = {
  frameWidthPx: number
  frameHeightPx: number
  columns: 1 | 2
  slideStridePx: number
}

export const SHORTS_DESKTOP_MIN_WIDTH = 640

export function computeShortsFrameLayout(
  viewportWidth: number,
  viewportHeight: number,
  chromeTopPx: number,
  chromeBottomPx: number,
): ShortsFrameLayout {
  const availH = Math.max(280, viewportHeight - chromeTopPx - chromeBottomPx)
  let frameWidthPx = Math.min(availH * (9 / 16), Math.max(200, viewportWidth - 48))
  const cappedHeight = Math.min(frameWidthPx * (16 / 9), availH)
  const finalWidth = cappedHeight * (9 / 16)
  const columns: 1 | 2 = 1
  const slideStridePx = availH

  return {
    frameWidthPx: finalWidth,
    frameHeightPx: cappedHeight,
    columns,
    slideStridePx,
  }
}

/** Desktop Shorts (≥640px) 9:16 frame sizing — phone uses main CSS only. */

export type ShortsFrameLayout = {
  frameWidthPx: number
  frameHeightPx: number
  columns: 1 | 2
  slideStridePx: number
}

const PEEK_VISIBLE_RATIO = 0.4 // ~40% of next Short visible
const COL_GAP_PX = 20
export const SHORTS_DESKTOP_MIN_WIDTH = 640

export function computeShortsFrameLayout(
  viewportWidth: number,
  viewportHeight: number,
  chromeTopPx: number,
  chromeBottomPx: number,
): ShortsFrameLayout {
  const availH = Math.max(280, viewportHeight - chromeTopPx - chromeBottomPx)
  const maxFrameH = availH
  const frameHeightPx = Math.min(maxFrameH, maxFrameH / (1 + PEEK_VISIBLE_RATIO))
  let frameWidthPx = frameHeightPx * (9 / 16)

  const twoFit =
    viewportWidth >= 1180
    && frameWidthPx * 2 + COL_GAP_PX + 48 <= viewportWidth

  const columns: 1 | 2 = twoFit ? 2 : 1
  if (columns === 2) {
    const pairW = (viewportWidth - 48 - COL_GAP_PX) / 2
    frameWidthPx = Math.min(pairW, frameWidthPx)
  }

  const frameHeightPxFinal = frameWidthPx * (16 / 9)
  const cappedHeight = Math.min(frameHeightPxFinal, maxFrameH)
  const finalWidth = cappedHeight * (9 / 16)
  const slideStridePx = cappedHeight * (1 + PEEK_VISIBLE_RATIO)

  return {
    frameWidthPx: finalWidth,
    frameHeightPx: cappedHeight,
    columns,
    slideStridePx,
  }
}

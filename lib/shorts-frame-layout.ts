/** Shared Shorts 9:16 frame sizing — phone and desktop use the same math. */

export type ShortsFrameLayout = {
  frameWidthPx: number
  frameHeightPx: number
  columns: 1 | 2
  slideStridePx: number
}

const ASPECT = 16 / 9 // height / width for 9:16 portrait
const PEEK_VISIBLE_RATIO = 0.5 // ~half of next Short visible below
const COL_GAP_PX = 20
const MIN_DESKTOP_W = 640

export function computeShortsFrameLayout(
  viewportWidth: number,
  viewportHeight: number,
  chromeTopPx: number,
  chromeBottomPx: number,
): ShortsFrameLayout {
  const availH = Math.max(320, viewportHeight - chromeTopPx - chromeBottomPx)
  const isPhone = viewportWidth < MIN_DESKTOP_W

  if (isPhone) {
    const horizontalPad = 32
    const frameWidthPx = Math.max(240, viewportWidth - horizontalPad)
    const frameHeightPx = frameWidthPx * ASPECT
    const slideStridePx = Math.max(frameHeightPx + 24, availH)
    return { frameWidthPx, frameHeightPx, columns: 1, slideStridePx }
  }

  const frameHeightPx = availH / (1 + PEEK_VISIBLE_RATIO)
  let frameWidthPx = frameHeightPx / ASPECT
  const maxSingleW = Math.min(viewportWidth - 48, 520)
  if (frameWidthPx > maxSingleW) {
    frameWidthPx = maxSingleW
  }

  const twoFit =
    viewportWidth >= 1180
    && frameWidthPx * 2 + COL_GAP_PX + 48 <= viewportWidth

  const columns: 1 | 2 = twoFit ? 2 : 1
  if (columns === 2) {
    const pairW = (viewportWidth - 48 - COL_GAP_PX) / 2
    frameWidthPx = Math.min(pairW, frameWidthPx)
  }

  const frameHeightPxFinal = frameWidthPx * ASPECT
  const slideStridePx = frameHeightPxFinal * (1 + PEEK_VISIBLE_RATIO)

  return {
    frameWidthPx,
    frameHeightPx: frameHeightPxFinal,
    columns,
    slideStridePx,
  }
}

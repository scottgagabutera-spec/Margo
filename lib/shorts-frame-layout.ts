/** Shorts frame sizing — one card per viewport, 9:16 on desktop/tablet, phone width-led. */

export type ShortsFrameLayout = {
  frameWidthPx: number
  frameHeightPx: number
  columns: 1
  slideStridePx: number
  scrollAreaHeightPx: number
}

export const SHORTS_DESKTOP_MIN_WIDTH = 640
export const SHORTS_DESKTOP_MAX_FRAME_H = 960
export const SHORTS_DESKTOP_VERTICAL_RESERVE = 48
export const SHORTS_ARROW_SIZE_PX = 52
export const SHORTS_ARROW_GAP_PX = 24
export const SHORTS_PHONE_WIDTH_MARGIN = 32
export const SHORTS_PHONE_BOTTOM_RESERVE = 28

export type ShortsChromeInput = {
  navPx: number
  feedTabBarPx: number
  vibeBarPx: number
  mobileTabBarPx: number
}

export function shortsTopChromePx(chrome: ShortsChromeInput): number {
  return chrome.navPx + chrome.feedTabBarPx + chrome.vibeBarPx
}

/** Visible scrollport height for the Shorts pager. */
export function computeShortsScrollAreaHeight(
  viewportHeight: number,
  chrome: ShortsChromeInput,
  desktop: boolean,
): number {
  const top = shortsTopChromePx(chrome)
  if (desktop) {
    return Math.max(200, viewportHeight - top)
  }
  return Math.max(200, viewportHeight - top - chrome.mobileTabBarPx)
}

export function computeShortsPhoneFrameLayout(
  viewportWidth: number,
  scrollAreaHeightPx: number,
): ShortsFrameLayout {
  const frameWidthPx = Math.max(160, viewportWidth - SHORTS_PHONE_WIDTH_MARGIN)
  const frameHeightPx = Math.max(
    160,
    scrollAreaHeightPx - SHORTS_PHONE_BOTTOM_RESERVE,
  )
  return {
    frameWidthPx,
    frameHeightPx,
    columns: 1,
    slideStridePx: scrollAreaHeightPx,
    scrollAreaHeightPx,
  }
}

export function computeShortsDesktopFrameLayout(
  viewportWidth: number,
  scrollAreaHeightPx: number,
): ShortsFrameLayout {
  const maxWFromViewport =
    viewportWidth - 2 * (SHORTS_ARROW_SIZE_PX + SHORTS_ARROW_GAP_PX)
  let frameHeightPx = Math.min(
    SHORTS_DESKTOP_MAX_FRAME_H,
    Math.max(200, scrollAreaHeightPx - SHORTS_DESKTOP_VERTICAL_RESERVE),
  )
  let frameWidthPx = frameHeightPx * (9 / 16)
  if (frameWidthPx > maxWFromViewport) {
    frameWidthPx = Math.max(160, maxWFromViewport)
    frameHeightPx = frameWidthPx * (16 / 9)
  }
  frameHeightPx = Math.min(
    frameHeightPx,
    scrollAreaHeightPx - SHORTS_DESKTOP_VERTICAL_RESERVE,
    SHORTS_DESKTOP_MAX_FRAME_H,
  )
  frameWidthPx = frameHeightPx * (9 / 16)
  return {
    frameWidthPx,
    frameHeightPx,
    columns: 1,
    slideStridePx: scrollAreaHeightPx,
    scrollAreaHeightPx,
  }
}

/** @deprecated use computeShortsDesktopFrameLayout */
export function computeShortsFrameLayout(
  viewportWidth: number,
  viewportHeight: number,
  chromeTopPx: number,
  _chromeBottomPx: number,
): ShortsFrameLayout {
  const scrollAreaHeightPx = Math.max(200, viewportHeight - chromeTopPx)
  return computeShortsDesktopFrameLayout(viewportWidth, scrollAreaHeightPx)
}

export function computeShortsFrameLayoutForViewport(
  viewportWidth: number,
  viewportHeight: number,
  chrome: ShortsChromeInput,
): ShortsFrameLayout {
  const desktop = viewportWidth >= SHORTS_DESKTOP_MIN_WIDTH
  const scrollAreaHeightPx = computeShortsScrollAreaHeight(
    viewportHeight,
    chrome,
    desktop,
  )
  if (desktop) {
    return computeShortsDesktopFrameLayout(viewportWidth, scrollAreaHeightPx)
  }
  return computeShortsPhoneFrameLayout(viewportWidth, scrollAreaHeightPx)
}

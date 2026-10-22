/**
 * Pure geometry for the feed Lyric Back keyboard.
 * Coordinates match Element.getBoundingClientRect and position:fixed
 * (layout viewport). The visible band is visualViewport.offsetTop + height.
 */

export const LYRIC_BACK_KEYBOARD_THRESHOLD_PX = 120

export function visualKeyboardInsetPx(input: {
  innerHeight: number
  viewportHeight: number
  offsetTop: number
}): number {
  return Math.max(0, input.innerHeight - input.viewportHeight - input.offsetTop)
}

/**
 * Max panel height inside the visual viewport.
 * A negative element top must not inflate the cap (no floor).
 */
export function lyricBackPanelCapPx(input: {
  elementTop: number
  offsetTop: number
  viewportHeight: number
  bottomPad: number
}): number {
  const visibleTop = input.offsetTop
  const visibleBottom = input.offsetTop + input.viewportHeight
  const top = Math.max(input.elementTop, visibleTop)
  return Math.max(0, Math.round(visibleBottom - top - input.bottomPad))
}

/** How far to scroll the feed pane so the search top lands under the nav. */
export function feedSearchScrollDelta(input: {
  searchTop: number
  navHeight: number
  chromeBelowNav?: number
  gap?: number
}): number {
  const gap = input.gap ?? 12
  const chrome = input.chromeBelowNav ?? 0
  const desiredTop = input.navHeight + chrome + gap
  return input.searchTop - desiredTop
}

export function panelSearchDropdownFrame(input: {
  anchorTop: number
  anchorBottom: number
  offsetTop: number
  viewportHeight: number
  bottomInset: number
  gap?: number
  edge?: number
  maxCap?: number
}): { top: number; maxHeight: number } {
  const gap = input.gap ?? 6
  const edge = input.edge ?? 12
  const maxCap = input.maxCap ?? 420
  const visibleTop = input.offsetTop
  const visibleBottom = input.offsetTop + input.viewportHeight
  const spaceBelow = visibleBottom - input.anchorBottom - input.bottomInset - gap
  const spaceAbove = input.anchorTop - visibleTop - gap - edge
  const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
  const available = openUp ? spaceAbove : spaceBelow
  const maxHeight = Math.min(maxCap, Math.max(0, available))
  const top = openUp
    ? Math.max(visibleTop + edge, input.anchorTop - gap - maxHeight)
    : input.anchorBottom + gap
  return { top, maxHeight }
}

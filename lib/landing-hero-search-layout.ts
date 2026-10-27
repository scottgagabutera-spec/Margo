/** Expected landing hero search width (matches main stage column). */
export function landingHeroSearchWidthPx(viewportWidth: number): number {
  return Math.min(Math.max(0, viewportWidth - 48), 480)
}

/** Stage dropdown row title size (compose-search-dropdown stage inline styles). */
export const STAGE_SEARCH_ROW_TITLE_FONT_PX = 14.4 // 0.9rem at 16px root

/** Stage dropdown thumbnail (compose-search-dropdown stage). */
export const STAGE_SEARCH_ROW_THUMB_PX = 44

/** Canonical layout metrics from globals.css / component styles (px at 16px root). */

export const MARGO_TOUCH_MIN_PX = 44
export const MARGO_SAFE_GAP_PX = 8
export const MARGO_HEADER_CLEARANCE_PX = MARGO_SAFE_GAP_PX

export const LANDING_NAV_PADDING_Y_PX = 16
export const LANDING_LOGO_LOCKUP_PX = 36
/** In-flow landing header ≈ 16 + 36 + 16 (safe-area extra at runtime). */
export const LANDING_NAV_ESTIMATE_PX = 68

export const STAGE_WORDMARK_PX = 26
export const STAGE_WORDMARK_GAP_PX = 14
export const STAGE_TAGLINE_PX = 19
export const STAGE_TAGLINE_GAP_PX = 22
export const STAGE_SEARCH_FIELD_PX = 44

export const STAGE_SEARCH_ROW_PX = 68

export const DEFAULT_NAV_HEIGHT_PX = 72
export const DEFAULT_TABBAR_PX = 80
export const MINI_PLAYER_PILL_PX = 44

export function landingHeroBlockHeightPx(): number {
  return (
    STAGE_WORDMARK_PX
    + STAGE_WORDMARK_GAP_PX
    + STAGE_TAGLINE_PX
    + STAGE_TAGLINE_GAP_PX
    + STAGE_SEARCH_FIELD_PX
  )
}

export function landingSearchNeededBottomPx(searchBottomY: number): number {
  return searchBottomY + MARGO_SAFE_GAP_PX + STAGE_SEARCH_ROW_PX * 2.5 + MARGO_SAFE_GAP_PX
}

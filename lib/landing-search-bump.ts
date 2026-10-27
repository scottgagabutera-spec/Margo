import {
  STAGE_SEARCH_ROW_PX,
  MARGO_HEADER_CLEARANCE_PX,
  MARGO_SAFE_GAP_PX,
  STAGE_SEARCH_FIELD_PX,
  STAGE_TAGLINE_GAP_PX,
  STAGE_TAGLINE_PX,
  STAGE_WORDMARK_GAP_PX,
  STAGE_WORDMARK_PX,
} from './margo-chrome-metrics.ts'

export type LandingSearchBumpInput = {
  offsetTop: number
  viewportHeight: number
  headerBottom: number
  blockTop: number
}

export type LandingSearchBumpPlan = {
  shiftPx: number
  hideTagline: boolean
  hideWordmark: boolean
  dropdownMaxPx: number
}

function introHeightPx(hideTagline: boolean, hideWordmark: boolean): number {
  if (hideWordmark) return 0
  if (hideTagline) return STAGE_WORDMARK_PX + STAGE_WORDMARK_GAP_PX
  return STAGE_WORDMARK_PX + STAGE_WORDMARK_GAP_PX + STAGE_TAGLINE_PX + STAGE_TAGLINE_GAP_PX
}

function planFor(input: LandingSearchBumpInput, hideTagline: boolean, hideWordmark: boolean): LandingSearchBumpPlan {
  const vvBottom = input.offsetTop + input.viewportHeight
  const minBlockTop = input.headerBottom + MARGO_HEADER_CLEARANCE_PX
  const searchBottom = input.blockTop + introHeightPx(hideTagline, hideWordmark) + STAGE_SEARCH_FIELD_PX
  const neededBottomY = searchBottom + MARGO_SAFE_GAP_PX + STAGE_SEARCH_ROW_PX * 2.5 + MARGO_SAFE_GAP_PX
  const rawShift = Math.max(0, neededBottomY - vvBottom)
  const maxShift = Math.max(0, input.blockTop - minBlockTop)
  const shiftPx = Math.min(rawShift, maxShift)
  const searchBottomAfter = searchBottom - shiftPx
  const dropdownMaxPx = Math.max(
    Math.round(STAGE_SEARCH_ROW_PX * 1.5),
    Math.round(vvBottom - searchBottomAfter - MARGO_SAFE_GAP_PX),
  )
  return { shiftPx, hideTagline, hideWordmark, dropdownMaxPx }
}

function fits(plan: LandingSearchBumpPlan, input: LandingSearchBumpInput): boolean {
  const vvBottom = input.offsetTop + input.viewportHeight
  const searchBottom =
    input.blockTop
    + introHeightPx(plan.hideTagline, plan.hideWordmark)
    + STAGE_SEARCH_FIELD_PX
    - plan.shiftPx
  const neededBottomY = searchBottom + MARGO_SAFE_GAP_PX + STAGE_SEARCH_ROW_PX * 2.5 + MARGO_SAFE_GAP_PX
  const searchTop = searchBottom - STAGE_SEARCH_FIELD_PX
  return (
    searchTop >= input.headerBottom + MARGO_HEADER_CLEARANCE_PX - 0.5
    && neededBottomY <= vvBottom + 0.5
  )
}

/** Small bump: minimal shift; tagline fades first, then wordmark. */
export function computeLandingSearchBump(input: LandingSearchBumpInput): LandingSearchBumpPlan {
  const candidates = [
    planFor(input, false, false),
    planFor(input, true, false),
    planFor(input, true, true),
  ]
  for (const plan of candidates) {
    if (fits(plan, input)) return plan
  }
  return candidates[candidates.length - 1]
}

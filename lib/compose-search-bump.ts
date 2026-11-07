import {
  STAGE_SEARCH_ROW_PX,
  MARGO_HEADER_CLEARANCE_PX,
  MARGO_SAFE_GAP_PX,
  STAGE_SEARCH_FIELD_PX,
} from '@/lib/margo-chrome-metrics'

export type ComposeSearchBumpInput = {
  keyboardTop: number
  headerBottom: number
  /** Top edge of the search block (e.g. find-step title + tagline + search field). */
  blockTop: number
}

export type ComposeSearchBumpPlan = {
  shiftPx: number
  dropdownMaxPx: number
}

/**
 * Compose find-step: keep catalog results above the keyboard (same geometry as landing,
 * without the stage wordmark/tagline stack).
 */
export function computeComposeSearchBump(input: ComposeSearchBumpInput): ComposeSearchBumpPlan {
  const searchBottom = input.blockTop + STAGE_SEARCH_FIELD_PX
  const neededBottomY = searchBottom + MARGO_SAFE_GAP_PX + STAGE_SEARCH_ROW_PX * 2.5 + MARGO_SAFE_GAP_PX
  const rawShift = Math.max(0, neededBottomY - input.keyboardTop)
  const minBlockTop = input.headerBottom + MARGO_HEADER_CLEARANCE_PX
  const maxShift = Math.max(0, input.blockTop - minBlockTop)
  const shiftPx = Math.min(rawShift, maxShift)
  const searchBottomAfter = searchBottom - shiftPx
  const dropdownMaxPx = Math.max(
    Math.round(STAGE_SEARCH_ROW_PX * 1.5),
    Math.round(input.keyboardTop - searchBottomAfter - MARGO_SAFE_GAP_PX),
  )
  return { shiftPx, dropdownMaxPx }
}

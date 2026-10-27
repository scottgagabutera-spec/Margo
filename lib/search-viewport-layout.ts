/** Max listbox height below the search field bottom inside the visual viewport band. */
export function searchDropdownMaxHeightBelowPx(input: {
  anchorBottom: number
  offsetTop: number
  viewportHeight: number
  gap?: number
}): number {
  const gap = input.gap ?? 8
  const visibleBottom = input.offsetTop + input.viewportHeight
  return Math.max(0, Math.round(visibleBottom - input.anchorBottom - gap))
}

/** Hero anchor `top` (px from shell top) so the search field top hits `goalSearchTop`. */
export function landingHeroAnchorTopPx(input: {
  shellTop: number
  anchorTop: number
  searchTop: number
  goalSearchTop: number
}): number {
  const delta = input.goalSearchTop - input.searchTop
  return input.anchorTop - input.shellTop + delta
}

/** Idle hero block vertical center as fraction of shell height (spec: 41%). */
export const LANDING_HERO_IDLE_CENTER_FRACTION = 0.41

export function landingHeroCenterFractionPx(shellHeight: number): number {
  return shellHeight * LANDING_HERO_IDLE_CENTER_FRACTION
}

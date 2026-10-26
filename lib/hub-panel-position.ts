/** Desktop Hub dropdown — anchor under the visible Hub control, clamped in viewport. */

export type HubPanelPositionInput = {
  anchorRect: DOMRect | DOMRectReadOnly
  panelWidth: number
  panelHeight: number
  viewportWidth: number
  viewportHeight: number
  /** Gap below anchor (px). */
  gap?: number
  /** Minimum inset from viewport edges (px). */
  margin?: number
}

export type HubPanelPosition = { left: number; top: number }

export function computeHubPanelPosition(input: HubPanelPositionInput): HubPanelPosition {
  const gap = input.gap ?? 8
  const margin = input.margin ?? 8
  const { anchorRect: rect, panelWidth: w, panelHeight: h } = input
  const vw = input.viewportWidth
  const vh = input.viewportHeight

  let left = rect.right - w
  left = Math.max(margin, Math.min(left, vw - w - margin))

  let top = rect.bottom + gap
  if (top + h > vh - margin) {
    top = Math.max(margin, vh - h - margin)
  }
  top = Math.max(margin, top)

  return { left, top }
}

/** Prefer the anchor whose button is visible (non-zero box). */
export function pickVisibleHubAnchor(
  navButton: HTMLElement | null,
  tabButton: HTMLElement | null,
): HTMLElement | null {
  for (const el of [navButton, tabButton]) {
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return navButton ?? tabButton
}

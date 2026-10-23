/** Popover position for portaled post report menu (visual viewport aware). */

export function computeReportPopoverPosition(input: {
  triggerRect: DOMRect
  menuWidth: number
  menuHeight: number
  viewportTop: number
  viewportBottom: number
  viewportWidth: number
  viewportOffsetLeft?: number
  edgePad?: number
  gap?: number
}): { top: number; left: number; openUp: boolean } {
  const edgePad = input.edgePad ?? 8
  const gap = input.gap ?? 6
  const spaceBelow = input.viewportBottom - input.triggerRect.bottom - edgePad
  const spaceAbove = input.triggerRect.top - input.viewportTop - edgePad
  const openUp =
    spaceBelow < input.menuHeight + gap && spaceAbove >= input.menuHeight + gap
  const top = openUp
    ? input.triggerRect.top - gap - input.menuHeight
    : input.triggerRect.bottom + gap
  const offsetLeft = input.viewportOffsetLeft ?? 0
  const leftRaw = input.triggerRect.right - input.menuWidth + offsetLeft
  const left = Math.min(
    Math.max(edgePad + offsetLeft, leftRaw),
    Math.max(edgePad + offsetLeft, offsetLeft + input.viewportWidth - input.menuWidth - edgePad),
  )
  return { top, left, openUp }
}

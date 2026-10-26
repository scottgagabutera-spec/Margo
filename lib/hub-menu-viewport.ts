/** Which Hub shell is mounted for the current viewport (A6 — one sign-in id in DOM). */
export type HubViewportSurface = 'sheet' | 'panel' | 'none'

export function pickHubViewportSurface(
  open: boolean,
  isDesktop: boolean,
): HubViewportSurface {
  if (!open) return 'none'
  return isDesktop ? 'panel' : 'sheet'
}

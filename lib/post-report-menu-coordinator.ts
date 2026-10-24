/** Ensures only one post report "..." menu is open app-wide. */
let closeOther: (() => void) | null = null

export function claimReportMenu(closeSelf: () => void) {
  closeOther?.()
  closeOther = closeSelf
}

export function releaseReportMenu(closeSelf: () => void) {
  if (closeOther === closeSelf) closeOther = null
}

export function closeAnyReportMenu() {
  closeOther?.()
  closeOther = null
}

/** Compact profile ⋯ menu — width cap for all breakpoints [read from code]. */
export const PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX = 220

export function profileAccountMenuRowCount(isArtist: boolean): number {
  return isArtist ? 3 : 2
}

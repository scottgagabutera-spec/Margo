/** Usernames excluded from public artist discovery (demo / internal accounts). */
export const DISCOVER_EXCLUDED_ARTIST_USERNAMES = ['tiktokdemoreview'] as const

export function isExcludedDiscoverArtist(username: string | null | undefined): boolean {
  if (!username) return false
  return (DISCOVER_EXCLUDED_ARTIST_USERNAMES as readonly string[]).includes(username.toLowerCase())
}

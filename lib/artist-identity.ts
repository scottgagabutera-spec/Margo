/**
 * Display name vs @username — Instagram / X / Spotify pattern.
 *
 * - display_name: public artist/listener name. Shown first. Not unique.
 *   Example: "Margo"
 * - username: unique @handle, URL, mentions, search. Users cannot share it.
 *   Example: @trymargo
 *
 * Songs credit the public name (`artist_display_name`), never the handle.
 * If a credit was saved as the owner's @username (Firebase → Supabase
 * drift), present the display name so one verified artist never appears
 * as two.
 */

export function stripHandlePrefix(raw: string): string {
  return (raw || '').trim().replace(/^@+/, '')
}

export function handlesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = stripHandlePrefix(a || '').toLowerCase()
  const right = stripHandlePrefix(b || '').toLowerCase()
  return !!left && left === right
}

export function resolvePublicArtistCredit(input: {
  artistDisplayName?: string | null
  ownerDisplayName?: string | null
  ownerUsername?: string | null
}): string {
  const credit = (input.artistDisplayName || '').trim()
  const display = (input.ownerDisplayName || '').trim()
  const username = stripHandlePrefix(input.ownerUsername || '')
  if (!credit) return display || username
  if (username && handlesMatch(credit, username) && display) return display
  return stripHandlePrefix(credit)
}

/** Studio save: typing @handle stores the public display name instead. */
export function normalizeArtistCreditForSave(
  typed: string,
  identity: { displayName: string; username?: string | null },
): string {
  const display = (identity.displayName || '').trim()
  const username = stripHandlePrefix(identity.username || '')
  const t = (typed || '').trim()
  if (!t) return display
  if (username && handlesMatch(t, username)) return display || stripHandlePrefix(t)
  return stripHandlePrefix(t)
}

export function embedProfile(
  profiles:
    | { username?: string | null; display_name?: string | null }
    | { username?: string | null; display_name?: string | null }[]
    | null
    | undefined,
): { username?: string | null; display_name?: string | null } {
  if (!profiles) return {}
  return Array.isArray(profiles) ? (profiles[0] || {}) : profiles
}

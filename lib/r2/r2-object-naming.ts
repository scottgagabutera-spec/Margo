/**
 * Readable R2 keys: one folder per artist under Margo/artists/{artist-slug}-{uid8}/.
 * Step 3 URL migration should reuse these helpers.
 */

/** Slugs: lowercase ASCII + hyphens, max 40 chars. */
export const R2_SLUG_MAX = 40

const NON_ASCII = /[^a-z0-9-]+/g
const DUP_HYPHEN = /-+/g

const ARTISTS_ROOT = 'Margo/artists' as const

/** First 8 hex chars of a UUID (no hyphens), lowercase. */
export function shortId8FromUuid(uuid: string): string {
  const compact = uuid.replace(/-/g, '').toLowerCase()
  return compact.slice(0, 8)
}

/**
 * Safe segment for paths: empty/invalid input → "unknown".
 * Trim, lower, NFKD strip accents, keep [a-z0-9-], collapse hyphens, max 40.
 */
export function slugifySegment(raw: string | null | undefined): string {
  const s = (raw ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  let out = s.replace(NON_ASCII, '-').replace(DUP_HYPHEN, '-').replace(/^-|-$/g, '')
  if (!out) out = 'unknown'
  return out.length > R2_SLUG_MAX ? out.slice(0, R2_SLUG_MAX) : out
}

/** `Margo/artists/{artist-slug}-{uid8}` — single folder per artist */
export function artistRootPrefix(artistSlug: string, profileId: string): string {
  const folder = `${slugifySegment(artistSlug)}-${shortId8FromUuid(profileId)}`
  return `${ARTISTS_ROOT}/${folder}`
}

/** Catalog: .../audio/{song-title-slug}-{songid8}.{ext} */
export function catalogAudioObjectKey(
  artistSlug: string,
  profileId: string,
  songTitle: string,
  songId: string,
  extension: string,
): string {
  const base = `${slugifySegment(songTitle)}-${shortId8FromUuid(songId)}.${extension}`
  return `${artistRootPrefix(artistSlug, profileId)}/audio/${base}`
}

export function catalogArtworkObjectKey(
  artistSlug: string,
  profileId: string,
  songTitle: string,
  songId: string,
  extension: string,
): string {
  const base = `${slugifySegment(songTitle)}-${shortId8FromUuid(songId)}.${extension}`
  return `${artistRootPrefix(artistSlug, profileId)}/artwork/${base}`
}

/**
 * Promote staging (presigned PUT). Subfolder avoids clashing with final copy destination.
 * .../promote/staging/{song}-{queue8}.mp4
 */
export function promoteStagingObjectKeyParts(
  artistSlug: string,
  profileId: string,
  songTitle: string,
  queueId: string,
): string {
  const base = `${slugifySegment(songTitle)}-${shortId8FromUuid(queueId)}.mp4`
  return `${artistRootPrefix(artistSlug, profileId)}/promote/staging/${base}`
}

/** Final public promote MP4 after copy/publish: .../promote/{song}-{queue8}.mp4 */
export function promoteFinalVideoObjectKey(
  artistSlug: string,
  profileId: string,
  songTitle: string,
  queueId: string,
): string {
  const base = `${slugifySegment(songTitle)}-${shortId8FromUuid(queueId)}.mp4`
  return `${artistRootPrefix(artistSlug, profileId)}/promote/${base}`
}

// ── Legacy paths (still valid URLs; do not delete from bucket) ─────────────

/** Legacy catalog: Margo/audio|artwork/{profileId}/{songId}.ext */
export function legacyCatalogFlatKey(
  kind: 'audio' | 'artwork',
  profileId: string,
  songId: string,
  extension: string,
): string {
  const prefix = kind === 'audio' ? 'Margo/audio' : 'Margo/artwork'
  return `${prefix}/${profileId}/${songId}.${extension}`
}

/** Legacy readable catalog: Margo/audio|artwork/{folder}/{song}-{id}.ext */
export function legacyCatalogReadableKey(
  kind: 'audio' | 'artwork',
  artistLabel: string,
  profileId: string,
  songTitle: string,
  songId: string,
  extension: string,
): string {
  const folder = `${slugifySegment(artistLabel)}-${shortId8FromUuid(profileId)}`
  const base = `${slugifySegment(songTitle)}-${shortId8FromUuid(songId)}.${extension}`
  const prefix = kind === 'audio' ? 'Margo/audio' : 'Margo/artwork'
  return `${prefix}/${folder}/${base}`
}

/** Oldest promote staging: Margo/promote/staging/{profileId}/{queueId}.mp4 */
export function legacyPromoteStagingFlatKey(profileId: string, queueId: string): string {
  return `Margo/promote/staging/${profileId}/${queueId}.mp4`
}

/** PR #339 staging: Margo/promote/staging/{artist-folder}/{song}-{queue8}.mp4 */
export function legacyPromoteStagingReadableKey(
  artistLabel: string,
  profileId: string,
  songTitle: string,
  queueId: string,
): string {
  const folder = `${slugifySegment(artistLabel)}-${shortId8FromUuid(profileId)}`
  const base = `${slugifySegment(songTitle)}-${shortId8FromUuid(queueId)}.mp4`
  return `Margo/promote/staging/${folder}/${base}`
}

/** Legacy final promote: Margo/promote/{profileId}/{queueId}.mp4 */
export function legacyPromoteFinalKey(profileId: string, queueId: string): string {
  return `Margo/promote/${profileId}/${queueId}.mp4`
}

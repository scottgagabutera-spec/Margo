/**
 * Readable R2 keys for Studio catalog and promote staging.
 * Step 3 URL migration should reuse these helpers so paths stay consistent.
 */

/** Slugs: lowercase ASCII + hyphens, max 40 chars. */
export const R2_SLUG_MAX = 40

const NON_ASCII = /[^a-z0-9-]+/g
const DUP_HYPHEN = /-+/g

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

/** `artist-slug-xxxxxxxx/` under Margo/audio or Margo/artwork */
export function catalogArtistFolderSegment(artistSlug: string, profileId: string): string {
  return `${slugifySegment(artistSlug)}-${shortId8FromUuid(profileId)}`
}

/** `song-title-slug-xxxxxxxx.ext` */
export function catalogFileBaseName(songTitle: string, songId: string, extension: string): string {
  return `${slugifySegment(songTitle)}-${shortId8FromUuid(songId)}.${extension}`
}

/** Promote staging MP4 basename: queue row title + queue id (unique per render). */
export function promoteStagingFileBaseName(songTitle: string, queueId: string): string {
  return `${slugifySegment(songTitle)}-${shortId8FromUuid(queueId)}.mp4`
}

/** Legacy flat staging key (still accepted on publish for in-flight / old clients). */
export function legacyPromoteStagingObjectKey(profileId: string, queueId: string): string {
  return `Margo/promote/staging/${profileId}/${queueId}.mp4`
}

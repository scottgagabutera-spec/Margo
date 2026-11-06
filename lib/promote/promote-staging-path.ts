/** Presigned PUT path — must match public final promote layout for copy-on-publish. */
import {
  catalogArtistFolderSegment,
  promoteStagingFileBaseName,
  legacyPromoteStagingObjectKey,
} from '../r2/r2-object-naming.ts'

export const PROMOTE_STAGING_PREFIX = 'Margo/promote/staging' as const

export interface PromoteStagingKeyInput {
  profileId: string
  queueId: string
  /** When set with songTitle, uses readable paths; otherwise legacy flat key. */
  artistSlug?: string | null
  songTitle?: string | null
}

/**
 * Staging MP4 key. New format (readable):
 *   Margo/promote/staging/{artist-slug}-{uid8}/{song-slug}-{queueid8}.mp4
 * Legacy (still valid on publish): Margo/promote/staging/{profileId}/{queueId}.mp4
 */
export function promoteStagingObjectKey(input: PromoteStagingKeyInput): string {
  const { profileId, queueId, artistSlug, songTitle } = input
  const artist = (artistSlug ?? '').trim()
  const title = (songTitle ?? '').trim()
  if (artist && title) {
    const folder = catalogArtistFolderSegment(artist, profileId)
    const file = promoteStagingFileBaseName(title, queueId)
    return `${PROMOTE_STAGING_PREFIX}/${folder}/${file}`
  }
  return legacyPromoteStagingObjectKey(profileId, queueId)
}

/** Back-compat alias: flat key only. Prefer promoteStagingObjectKey({ ... }). */
export function legacyFlatPromoteStagingKey(profileId: string, queueId: string): string {
  return legacyPromoteStagingObjectKey(profileId, queueId)
}

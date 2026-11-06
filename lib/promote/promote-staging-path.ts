import { promoteStagingObjectKeyParts } from '../r2/r2-object-naming.ts'

export const PROMOTE_STAGING_SUBPATH = 'promote/staging' as const

export interface PromoteStagingKeyInput {
  profileId: string
  queueId: string
  artistSlug: string | null | undefined
  songTitle: string | null | undefined
}

/**
 * Staging MP4 for presigned PUT:
 * Margo/artists/{artist-slug}-{uid8}/promote/staging/{song-slug}-{queueid8}.mp4
 */
export function promoteStagingObjectKey(input: PromoteStagingKeyInput): string {
  const artist = (input.artistSlug ?? '').trim()
  const title = (input.songTitle ?? '').trim()
  if (!artist || !title) {
    throw new Error('artistSlug and songTitle required for promote staging key')
  }
  return promoteStagingObjectKeyParts(artist, input.profileId, title, input.queueId)
}

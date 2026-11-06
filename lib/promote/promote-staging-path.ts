/** Presigned PUT path — must match public final promote layout for copy-on-publish. */
export const PROMOTE_STAGING_PREFIX = 'Margo/promote/staging' as const

export function promoteStagingObjectKey(profileId: string, queueId: string): string {
  return `${PROMOTE_STAGING_PREFIX}/${profileId}/${queueId}.mp4`
}

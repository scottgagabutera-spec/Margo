import type { SupabaseClient } from '@supabase/supabase-js'

export type StagingCleanupFailureReason =
  | 'r2_delete_error'
  | 'targets_load_error'
  | 'targets_not_final'

export interface StagingCleanupFailureRow {
  id: string
  queue_id: string | null
  profile_id: string | null
  object_key: string
  reason: StagingCleanupFailureReason
  attempts: number
  last_error: string | null
  created_at: string
  last_attempt_at: string
  resolved_at: string | null
}

/** Structured log prefix — grep Vercel logs for this string. */
export const PROMOTE_CLEANUP_FAILURE_LOG = '[promote/cleanup-failure]'

export function logStagingCleanupFailure(details: Record<string, unknown>): void {
  console.error(PROMOTE_CLEANUP_FAILURE_LOG, JSON.stringify(details))
}

export async function recordStagingCleanupFailure(
  admin: SupabaseClient,
  input: {
    queueId: string
    profileId: string
    objectKey: string
    reason: StagingCleanupFailureReason
    errorMessage: string
  },
): Promise<void> {
  logStagingCleanupFailure({
    event: 'recorded',
    queueId: input.queueId,
    profileId: input.profileId,
    objectKey: input.objectKey,
    reason: input.reason,
    error: input.errorMessage,
  })

  const { data: existing } = await admin
    .from('promote_staging_cleanup_failures')
    .select('id, attempts')
    .eq('queue_id', input.queueId)
    .eq('object_key', input.objectKey)
    .is('resolved_at', null)
    .maybeSingle()

  if (existing?.id) {
    await admin
      .from('promote_staging_cleanup_failures')
      .update({
        reason: input.reason,
        attempts: (existing.attempts ?? 0) + 1,
        last_error: input.errorMessage,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return
  }

  await admin.from('promote_staging_cleanup_failures').insert({
    queue_id: input.queueId,
    profile_id: input.profileId,
    object_key: input.objectKey,
    reason: input.reason,
    attempts: 1,
    last_error: input.errorMessage,
  })
}

export async function resolveStagingCleanupFailure(
  admin: SupabaseClient,
  queueId: string,
  objectKey: string,
): Promise<void> {
  await admin
    .from('promote_staging_cleanup_failures')
    .update({ resolved_at: new Date().toISOString(), last_error: null })
    .eq('queue_id', queueId)
    .eq('object_key', objectKey)
    .is('resolved_at', null)
}

export async function listUnresolvedStagingCleanupFailures(
  admin: SupabaseClient,
  limit = 50,
): Promise<StagingCleanupFailureRow[]> {
  const { data, error } = await admin
    .from('promote_staging_cleanup_failures')
    .select('*')
    .is('resolved_at', null)
    .order('last_attempt_at', { ascending: true })
    .limit(limit)

  if (error) {
    logStagingCleanupFailure({ event: 'list_failures_error', error: error.message })
    return []
  }

  return (data || []) as StagingCleanupFailureRow[]
}

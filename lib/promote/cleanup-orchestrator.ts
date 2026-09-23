import type { SupabaseClient } from '@supabase/supabase-js'
import { expirePromoteQueueCandidates } from '@/lib/promote/cleanup-expired-candidates'
import {
  listUnresolvedStagingCleanupFailures,
  logStagingCleanupFailure,
} from '@/lib/promote/cleanup-staging-failures'
import { deletePromoteVideoWithRetry, retryPromoteStagingCleanup } from '@/lib/promote/cleanup-staging'
import { resolvePromoteObjectKey } from '@/lib/promote/r2-promote-upload'

export interface PromoteCleanupRunResult {
  expired: Awaited<ReturnType<typeof expirePromoteQueueCandidates>>
  stagingRetries: {
    scanned: number
    deleted: number
    failed: number
    skipped: number
  }
  failureRetries: {
    scanned: number
    deleted: number
    failed: number
  }
}

/** Find published/failed/partial rows that still reference staged R2 after publish. */
async function retryStaleStagingOnQueueRows(admin: SupabaseClient): Promise<{
  scanned: number
  deleted: number
  failed: number
  skipped: number
}> {
  const stats = { scanned: 0, deleted: 0, failed: 0, skipped: 0 }

  const { data: rows, error } = await admin
    .from('promote_queue')
    .select('id, profile_id, rendered_video_url, status')
    .not('rendered_video_url', 'is', null)
    .in('status', ['published', 'failed', 'partial', 'publishing'])
    .limit(50)

  if (error) {
    logStagingCleanupFailure({ event: 'stale_staging_query_error', error: error.message })
    return stats
  }

  for (const row of rows || []) {
    stats.scanned += 1
    const objectKey = resolvePromoteObjectKey(row.profile_id, row.id, row.rendered_video_url)
    const outcome = await retryPromoteStagingCleanup(admin, row.id, row.profile_id, objectKey)
    if (outcome.status === 'deleted') stats.deleted += 1
    else if (outcome.status === 'skipped') stats.skipped += 1
    else stats.failed += 1
  }

  return stats
}

async function retryRecordedFailures(admin: SupabaseClient): Promise<{
  scanned: number
  deleted: number
  failed: number
}> {
  const stats = { scanned: 0, deleted: 0, failed: 0 }
  const failures = await listUnresolvedStagingCleanupFailures(admin, 50)

  for (const failure of failures) {
    stats.scanned += 1
    if (!failure.queue_id || !failure.profile_id) {
      const deleteResult = await deletePromoteVideoWithRetry(failure.object_key)
      if (deleteResult.ok) {
        await admin
          .from('promote_staging_cleanup_failures')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', failure.id)
        stats.deleted += 1
      } else {
        stats.failed += 1
      }
      continue
    }

    const outcome = await retryPromoteStagingCleanup(
      admin,
      failure.queue_id,
      failure.profile_id,
      failure.object_key,
    )
    if (outcome.status === 'deleted') stats.deleted += 1
    else if (outcome.status === 'failed') stats.failed += 1
  }

  return stats
}

export async function runPromoteCleanupJob(admin: SupabaseClient): Promise<PromoteCleanupRunResult> {
  const expired = await expirePromoteQueueCandidates(admin)
  const stagingRetries = await retryStaleStagingOnQueueRows(admin)
  const failureRetries = await retryRecordedFailures(admin)

  console.info('[promote/cleanup] cron run complete', {
    expired,
    stagingRetries,
    failureRetries,
  })

  return { expired, stagingRetries, failureRetries }
}

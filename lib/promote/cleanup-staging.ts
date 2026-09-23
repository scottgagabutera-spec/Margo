import type { SupabaseClient } from '@supabase/supabase-js'
import {
  logStagingCleanupFailure,
  recordStagingCleanupFailure,
  resolveStagingCleanupFailure,
} from '@/lib/promote/cleanup-staging-failures'
import { deletePromoteVideo } from '@/lib/promote/r2-promote-upload'
import type { PromoteTargetStatus } from '@/lib/promote/types'

const FINAL_TARGET_STATUSES = new Set<PromoteTargetStatus>(['published', 'failed', 'skipped'])

const R2_DELETE_MAX_ATTEMPTS = 3
const R2_DELETE_RETRY_BASE_MS = 1000

export function allPromoteTargetsFinal(
  statuses: Array<PromoteTargetStatus | string | null | undefined>,
): boolean {
  if (statuses.length === 0) return false
  return statuses.every((status) => FINAL_TARGET_STATUSES.has(status as PromoteTargetStatus))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function deletePromoteVideoWithRetry(
  objectKey: string,
  maxAttempts = R2_DELETE_MAX_ATTEMPTS,
): Promise<{ ok: true } | { ok: false; error: string; attempts: number }> {
  let lastError = 'Unknown R2 delete error'
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await deletePromoteVideo(objectKey)
      return { ok: true }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < maxAttempts) {
        await sleep(R2_DELETE_RETRY_BASE_MS * attempt)
      }
    }
  }
  return { ok: false, error: lastError, attempts: maxAttempts }
}

export type StagingCleanupOutcome =
  | { status: 'deleted' }
  | { status: 'skipped'; reason: 'targets_not_final' | 'no_targets' }
  | { status: 'failed'; reason: 'targets_load_error' | 'r2_delete_error'; error: string }

/**
 * Delete the staged R2 MP4 only after every platform target is final.
 * Retries R2 delete up to 3 times; records unresolved failures for cron retry.
 */
export async function cleanupPromoteStagingVideoIfComplete(
  admin: SupabaseClient,
  queueId: string,
  profileId: string,
  objectKey: string,
): Promise<StagingCleanupOutcome> {
  const { data: targets, error } = await admin
    .from('promote_queue_targets')
    .select('status')
    .eq('queue_id', queueId)

  if (error) {
    const message = error.message
    logStagingCleanupFailure({
      event: 'targets_load_error',
      queueId,
      objectKey,
      error: message,
    })
    await recordStagingCleanupFailure(admin, {
      queueId,
      profileId,
      objectKey,
      reason: 'targets_load_error',
      errorMessage: message,
    })
    return { status: 'failed', reason: 'targets_load_error', error: message }
  }

  const statuses = (targets || []).map((row) => row.status as string)
  if (statuses.length === 0) {
    return { status: 'skipped', reason: 'no_targets' }
  }

  if (!allPromoteTargetsFinal(statuses)) {
    console.info('[promote/cleanup] skip — targets not all final', { queueId, statuses })
    return { status: 'skipped', reason: 'targets_not_final' }
  }

  const deleteResult = await deletePromoteVideoWithRetry(objectKey)
  if (!deleteResult.ok) {
    logStagingCleanupFailure({
      event: 'r2_delete_failed',
      queueId,
      profileId,
      objectKey,
      error: deleteResult.error,
      attempts: deleteResult.attempts,
    })
    await recordStagingCleanupFailure(admin, {
      queueId,
      profileId,
      objectKey,
      reason: 'r2_delete_error',
      errorMessage: deleteResult.error,
    })
    return { status: 'failed', reason: 'r2_delete_error', error: deleteResult.error }
  }

  console.info('[promote/cleanup] deleted staged video', { queueId, objectKey })
  await admin
    .from('promote_queue')
    .update({
      rendered_video_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', queueId)

  await resolveStagingCleanupFailure(admin, queueId, objectKey)
  return { status: 'deleted' }
}

/** Retry R2 delete for a queue row that still has rendered_video_url after publish. */
export async function retryPromoteStagingCleanup(
  admin: SupabaseClient,
  queueId: string,
  profileId: string,
  objectKey: string,
): Promise<StagingCleanupOutcome> {
  return cleanupPromoteStagingVideoIfComplete(admin, queueId, profileId, objectKey)
}

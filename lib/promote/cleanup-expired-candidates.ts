import type { SupabaseClient } from '@supabase/supabase-js'
import { logStagingCleanupFailure, recordStagingCleanupFailure } from '@/lib/promote/cleanup-staging-failures'
import { deletePromoteVideoWithRetry } from '@/lib/promote/cleanup-staging'
import { resolvePromoteObjectKey } from '@/lib/promote/r2-promote-upload'
import { PROMOTE_CANDIDATE_EXPIRY_MS } from '@/lib/promote/types'

type ExpiredQueueRow = {
  id: string
  profile_id: string
  status: string
  rendered_video_url: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
}

export interface ExpireCandidatesResult {
  scanned: number
  deleted: number
  r2Deleted: number
  r2Failed: number
  errors: string[]
}

function expiryCutoffIso(nowMs = Date.now()): string {
  return new Date(nowMs - PROMOTE_CANDIDATE_EXPIRY_MS).toISOString()
}

/**
 * Delete promote_queue rows in pending_review or rejected older than 2 hours.
 * Deletes paired R2 staging when rendered_video_url / object key exists.
 */
export async function expirePromoteQueueCandidates(
  admin: SupabaseClient,
  batchLimit = 100,
): Promise<ExpireCandidatesResult> {
  const cutoff = expiryCutoffIso()
  const result: ExpireCandidatesResult = {
    scanned: 0,
    deleted: 0,
    r2Deleted: 0,
    r2Failed: 0,
    errors: [],
  }

  const [pendingRes, rejectedRes] = await Promise.all([
    admin
      .from('promote_queue')
      .select('id, profile_id, status, rendered_video_url, created_at, updated_at, reviewed_at')
      .eq('status', 'pending_review')
      .lt('created_at', cutoff)
      .limit(batchLimit),
    admin
      .from('promote_queue')
      .select('id, profile_id, status, rendered_video_url, created_at, updated_at, reviewed_at')
      .eq('status', 'rejected')
      .lt('updated_at', cutoff)
      .limit(batchLimit),
  ])

  if (pendingRes.error) {
    result.errors.push(`pending_review query failed: ${pendingRes.error.message}`)
  }
  if (rejectedRes.error) {
    result.errors.push(`rejected query failed: ${rejectedRes.error.message}`)
  }

  const rows = [
    ...(pendingRes.data || []),
    ...(rejectedRes.data || []),
  ] as ExpiredQueueRow[]

  const uniqueById = new Map(rows.map((row) => [row.id, row]))
  result.scanned = uniqueById.size

  for (const row of uniqueById.values()) {
    const objectKey = resolvePromoteObjectKey(row.profile_id, row.id, row.rendered_video_url)
    const hasStaging = Boolean(row.rendered_video_url?.trim())

    if (hasStaging) {
      const deleteResult = await deletePromoteVideoWithRetry(objectKey)
      if (deleteResult.ok) {
        result.r2Deleted += 1
      } else {
        result.r2Failed += 1
        logStagingCleanupFailure({
          event: 'expiry_r2_delete_failed',
          queueId: row.id,
          profileId: row.profile_id,
          objectKey,
          status: row.status,
          error: deleteResult.error,
        })
        await recordStagingCleanupFailure(admin, {
          queueId: row.id,
          profileId: row.profile_id,
          objectKey,
          reason: 'r2_delete_error',
          errorMessage: deleteResult.error,
        })
        // Still delete DB row — failure table retries orphan R2 via cron.
      }
    }

    const { error: deleteErr } = await admin
      .from('promote_queue')
      .delete()
      .eq('id', row.id)

    if (deleteErr) {
      result.errors.push(`delete ${row.id} failed: ${deleteErr.message}`)
      continue
    }

    result.deleted += 1
    console.info('[promote/cleanup] expired queue row', {
      queueId: row.id,
      status: row.status,
      hadStaging: hasStaging,
      objectKey: hasStaging ? objectKey : null,
    })
  }

  return result
}

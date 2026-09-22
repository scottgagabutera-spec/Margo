import type { SupabaseClient } from '@supabase/supabase-js'
import { deletePromoteVideo } from '@/lib/promote/r2-promote-upload'
import type { PromoteTargetStatus } from '@/lib/promote/types'

const FINAL_TARGET_STATUSES = new Set<PromoteTargetStatus>(['published', 'failed', 'skipped'])

export function allPromoteTargetsFinal(
  statuses: Array<PromoteTargetStatus | string | null | undefined>,
): boolean {
  if (statuses.length === 0) return false
  return statuses.every((status) => FINAL_TARGET_STATUSES.has(status as PromoteTargetStatus))
}

/**
 * Delete the staged R2 MP4 only after every platform target is final.
 * Never deletes while a target is still pending or publishing.
 */
export async function cleanupPromoteStagingVideoIfComplete(
  admin: SupabaseClient,
  queueId: string,
  objectKey: string,
): Promise<boolean> {
  const { data: targets, error } = await admin
    .from('promote_queue_targets')
    .select('status, publish_adapter')
    .eq('queue_id', queueId)

  if (error) {
    console.error('[promote/cleanup] failed to load targets', { queueId, error: error.message })
    return false
  }

  const rows = targets || []
  const statuses = rows.map((row) => row.status as string)
  if (!allPromoteTargetsFinal(statuses)) {
    console.info('[promote/cleanup] skip — targets not all final', { queueId, statuses })
    return false
  }

  const hasBufferTarget = rows.some((row) => row.publish_adapter === 'buffer')
  if (hasBufferTarget) {
    console.info('[promote/cleanup] skip — Buffer targets need stable public URL until post is sent', { queueId })
    return false
  }

  try {
    await deletePromoteVideo(objectKey)
    console.info('[promote/cleanup] deleted staged video', { queueId, objectKey })
    await admin
      .from('promote_queue')
      .update({
        rendered_video_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueId)
    return true
  } catch (err) {
    console.error('[promote/cleanup] R2 delete failed', {
      queueId,
      objectKey,
      error: err instanceof Error ? err.message : err,
    })
    return false
  }
}

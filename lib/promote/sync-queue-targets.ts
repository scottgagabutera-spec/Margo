import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildQueueTargetSyncRows,
  type QueueTargetSyncRow,
} from '@/lib/promote/queue-item-platforms'
import { fetchArtistSocialConnections } from '@/lib/promote/build-queue-targets'
import type { MomentShapeId } from '@/lib/moment/types'
import type { PromotePlatform, PromoteTargetStatus } from '@/lib/promote/types'

type ExistingTargetRow = {
  id: string
  platform: PromotePlatform
  status: PromoteTargetStatus
}

export async function syncPromoteQueueTargets(
  admin: SupabaseClient,
  profileId: string,
  queueId: string,
  shapeId: MomentShapeId,
  selectedPlatforms: PromotePlatform[],
): Promise<void> {
  const [connections, targetsRes] = await Promise.all([
    fetchArtistSocialConnections(admin, profileId),
    admin
      .from('promote_queue_targets')
      .select('id, platform, status')
      .eq('queue_id', queueId),
  ])

  if (targetsRes.error) throw targetsRes.error

  const existingTargets = (targetsRes.data || []) as ExistingTargetRow[]
  const syncRows = buildQueueTargetSyncRows(shapeId, selectedPlatforms, connections, existingTargets)
  await applyQueueTargetSyncRows(admin, queueId, existingTargets, syncRows)
}

async function applyQueueTargetSyncRows(
  admin: SupabaseClient,
  queueId: string,
  existingTargets: ExistingTargetRow[],
  syncRows: QueueTargetSyncRow[],
): Promise<void> {
  const existingByPlatform = new Map(existingTargets.map((t) => [t.platform, t]))

  for (const row of syncRows) {
    const existing = existingByPlatform.get(row.platform)
    if (existing) {
      const { error } = await admin
        .from('promote_queue_targets')
        .update({
          connection_id: row.connection_id,
          status: row.status,
          error_message: row.error_message,
        })
        .eq('id', existing.id)
      if (error) throw error
      continue
    }

    const { error } = await admin.from('promote_queue_targets').insert({
      queue_id: queueId,
      platform: row.platform,
      connection_id: row.connection_id,
      status: row.status,
      error_message: row.error_message,
    })
    if (error) throw error
  }
}

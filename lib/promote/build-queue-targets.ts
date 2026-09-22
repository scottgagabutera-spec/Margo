import type { SupabaseClient } from '@supabase/supabase-js'
import { connectPlatformMessage, isPromotePlatformLive } from '@/lib/promote/platforms'
import type { PromotePlatform } from '@/lib/promote/types'

type ConnectionRow = {
  id: string
  platform: PromotePlatform
  status: string
}

export interface PromoteQueueTargetInsert {
  queue_id: string
  platform: PromotePlatform
  connection_id: string | null
  status: 'pending' | 'skipped'
  error_message: string | null
}

export async function fetchArtistSocialConnections(
  admin: SupabaseClient,
  profileId: string,
): Promise<ConnectionRow[]> {
  const { data } = await admin
    .from('artist_social_connections')
    .select('id, platform, status')
    .eq('profile_id', profileId)
  return (data || []) as ConnectionRow[]
}

/** Build one target row per live platform for this shape. Skips platforms without a live connection. */
export function buildPromoteQueueTargetRows(
  queueId: string,
  platforms: PromotePlatform[],
  connections: ConnectionRow[],
): PromoteQueueTargetInsert[] {
  const byPlatform = new Map(connections.map((c) => [c.platform, c]))

  return platforms
    .filter((platform) => isPromotePlatformLive(platform))
    .map((platform) => {
      const connection = byPlatform.get(platform)
      const connected = connection?.status === 'connected'
      return {
        queue_id: queueId,
        platform,
        connection_id: connection?.id ?? null,
        status: connected ? 'pending' : 'skipped',
        error_message: connected ? null : connectPlatformMessage(platform),
      }
    })
}

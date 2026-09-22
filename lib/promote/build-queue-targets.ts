import type { SupabaseClient } from '@supabase/supabase-js'
import { connectPlatformMessage, isPromotePlatformDirectLive } from '@/lib/promote/platforms'
import type { PromotePlatform, PublishAdapterKind } from '@/lib/promote/types'

type ConnectionRow = {
  id: string
  platform: PromotePlatform
  status: string
  publish_adapter?: string
}

export interface PromoteQueueTargetInsert {
  queue_id: string
  platform: PromotePlatform
  connection_id: string | null
  publish_adapter: PublishAdapterKind
  status: 'pending' | 'skipped'
  error_message: string | null
}

export async function fetchArtistSocialConnections(
  admin: SupabaseClient,
  profileId: string,
): Promise<ConnectionRow[]> {
  const { data } = await admin
    .from('artist_social_connections')
    .select('id, platform, status, publish_adapter, platform_meta')
    .eq('profile_id', profileId)
  return (data || []) as ConnectionRow[]
}

/** Build target rows for direct-live platforms (catalog auto-generate path). */
export function buildPromoteQueueTargetRows(
  queueId: string,
  selectedPlatforms: PromotePlatform[],
  connections: ConnectionRow[],
): PromoteQueueTargetInsert[] {
  const byPlatform = new Map(connections.map((c) => [c.platform, c]))

  return selectedPlatforms
    .filter((platform) => isPromotePlatformDirectLive(platform))
    .map((platform) => {
      const connection = byPlatform.get(platform)
      const connected = connection?.status === 'connected'
      return {
        queue_id: queueId,
        platform,
        connection_id: connection?.id ?? null,
        publish_adapter: 'direct' as const,
        status: connected ? 'pending' : 'skipped',
        error_message: connected ? null : connectPlatformMessage(platform),
      }
    })
}

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchArtistBufferConnection,
  type BufferConnectionRow,
} from '@/lib/promote/buffer/connections'
import { mapBufferChannelsByPlatform } from '@/lib/promote/buffer/service-map'
import {
  fetchArtistSocialConnections,
  type PromoteQueueTargetInsert,
} from '@/lib/promote/build-queue-targets'
import {
  connectPlatformMessage,
  getPromotePlatformDef,
  isPromotePlatformDirectLive,
  platformSupportsShape,
  requiredShapeLabels,
} from '@/lib/promote/platforms'
import type { MomentShapeId } from '@/lib/moment/types'
import type { PromotePlatform, PublishAdapterKind } from '@/lib/promote/types'

type ConnectionRow = {
  id: string
  platform: PromotePlatform
  status: string
  publish_adapter?: string
  platform_meta?: Record<string, unknown> | null
}

export interface PlatformPublishReadiness {
  platform: PromotePlatform
  adapter: PublishAdapterKind
  connected: boolean
  connectionId: string | null
  bufferChannelId: string | null
}

export function isPlatformPublishReady(
  platform: PromotePlatform,
  connections: ConnectionRow[],
  bufferConnection: BufferConnectionRow | null,
  shapeId?: MomentShapeId,
): boolean {
  if (shapeId && !platformSupportsShape(platform, shapeId)) return false

  const direct = connections.find((c) => c.platform === platform && c.publish_adapter !== 'buffer')
  if (direct?.status === 'connected' && isPromotePlatformDirectLive(platform)) return true

  const bufferBacked = connections.find((c) => c.platform === platform && c.publish_adapter === 'buffer')
  if (bufferBacked?.status === 'connected') return true

  if (bufferConnection?.status === 'connected') {
    const channels = bufferConnection.channels ?? []
    return mapBufferChannelsByPlatform(channels).has(platform)
  }

  return false
}

export function resolvePlatformPublishReadiness(
  platform: PromotePlatform,
  connections: ConnectionRow[],
  bufferConnection: BufferConnectionRow | null,
): PlatformPublishReadiness {
  const bufferChannels = bufferConnection?.channels ?? []
  const bufferByPlatform = mapBufferChannelsByPlatform(bufferChannels)

  const directConn = connections.find(
    (c) => c.platform === platform && c.publish_adapter !== 'buffer' && c.status === 'connected',
  )
  if (directConn && isPromotePlatformDirectLive(platform)) {
    return {
      platform,
      adapter: 'direct',
      connected: true,
      connectionId: directConn.id,
      bufferChannelId: null,
    }
  }

  const bufferConn = connections.find(
    (c) => c.platform === platform && c.publish_adapter === 'buffer' && c.status === 'connected',
  )
  const bufferChannel = bufferByPlatform.get(platform)
  if (bufferConn || bufferChannel) {
    const metaChannelId = typeof bufferConn?.platform_meta?.bufferChannelId === 'string'
      ? bufferConn.platform_meta.bufferChannelId
      : null
    return {
      platform,
      adapter: 'buffer',
      connected: Boolean(bufferConn || (bufferConnection?.status === 'connected' && bufferChannel)),
      connectionId: bufferConn?.id ?? null,
      bufferChannelId: bufferChannel?.id ?? metaChannelId,
    }
  }

  return {
    platform,
    adapter: 'direct',
    connected: false,
    connectionId: null,
    bufferChannelId: null,
  }
}

export async function loadArtistPublishContext(
  admin: SupabaseClient,
  profileId: string,
): Promise<{ connections: ConnectionRow[]; bufferConnection: BufferConnectionRow | null }> {
  const [connections, bufferConnection] = await Promise.all([
    fetchArtistSocialConnections(admin, profileId),
    fetchArtistBufferConnection(admin, profileId),
  ])
  return { connections, bufferConnection }
}

export function buildPromoteQueueTargetRowsWithAdapters(
  queueId: string,
  selectedPlatforms: PromotePlatform[],
  connections: ConnectionRow[],
  bufferConnection: BufferConnectionRow | null,
): PromoteQueueTargetInsert[] {
  return selectedPlatforms.map((platform) => {
    const readiness = resolvePlatformPublishReadiness(platform, connections, bufferConnection)
    return {
      queue_id: queueId,
      platform,
      connection_id: readiness.connectionId,
      publish_adapter: readiness.adapter,
      status: readiness.connected ? 'pending' : 'skipped',
      error_message: readiness.connected ? null : connectPlatformMessage(platform),
    }
  })
}

export async function validateArtistSelectedPlatforms(
  admin: SupabaseClient,
  profileId: string,
  shapeId: MomentShapeId,
  platforms: PromotePlatform[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (platforms.length === 0) {
    return { ok: false, error: 'Select at least one platform.' }
  }

  const { connections, bufferConnection } = await loadArtistPublishContext(admin, profileId)

  for (const platform of platforms) {
    if (!platformSupportsShape(platform, shapeId)) {
      const label = getPromotePlatformDef(platform)?.label ?? platform
      return { ok: false, error: `${label} requires ${requiredShapeLabels(platform)} for this export.` }
    }
    if (!isPlatformPublishReady(platform, connections, bufferConnection, shapeId)) {
      const label = getPromotePlatformDef(platform)?.label ?? platform
      return { ok: false, error: `${label} is not connected — connect in Settings or via Buffer.` }
    }
  }
  return { ok: true }
}

export function publishablePlatformsForShape(
  shapeId: MomentShapeId,
  connections: ConnectionRow[],
  bufferConnection: BufferConnectionRow | null,
): PromotePlatform[] {
  const candidates = new Set<PromotePlatform>()
  for (const conn of connections) {
    if (conn.status === 'connected') candidates.add(conn.platform)
  }
  if (bufferConnection?.status === 'connected') {
    for (const platform of mapBufferChannelsByPlatform(bufferConnection.channels ?? []).keys()) {
      candidates.add(platform)
    }
  }

  return [...candidates].filter((platform) =>
    isPlatformPublishReady(platform, connections, bufferConnection, shapeId),
  )
}

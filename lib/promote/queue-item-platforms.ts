import { connectPlatformMessage, PROMOTE_PLATFORM_DEFS, platformSupportsShape, shapeRequirementHint } from '@/lib/promote/platforms'
import type { PublishedPlatformRecord } from '@/lib/promote/publish-history'
import type { MomentShapeId } from '@/lib/moment/types'
import type { PromotePlatform, PromoteTargetStatus } from '@/lib/promote/types'

export type QueueItemPlatformState =
  | 'selectable'
  | 'wrong_shape'
  | 'not_connected'
  | 'coming_soon'
  | 'already_published'
  | 'published'
  | 'locked'

export interface QueueItemPlatformRow {
  id: PromotePlatform
  label: string
  live: boolean
  state: QueueItemPlatformState
  shapeHint: string | null
  connected: boolean
  publishedAt: string | null
  externalPostUrl: string | null
  targetStatus: PromoteTargetStatus | null
}

type ConnectionRow = {
  id: string
  platform: PromotePlatform
  status: string
}

type ExistingTargetRow = {
  platform: PromotePlatform
  status: PromoteTargetStatus
  published_at?: string | null
  external_post_url?: string | null
}

const IMMUTABLE_TARGET_STATUSES = new Set<PromoteTargetStatus>(['published', 'publishing', 'failed'])

export function selectedPlatformsFromTargets(
  targets: ExistingTargetRow[],
): PromotePlatform[] {
  return targets
    .filter((t) => t.status === 'pending' || t.status === 'publishing')
    .map((t) => t.platform)
}

export function computeQueueItemPlatformRows(
  shapeId: MomentShapeId,
  connections: ConnectionRow[],
  existingTargets: ExistingTargetRow[],
  publishedByPlatform: Map<PromotePlatform, PublishedPlatformRecord>,
  selectedPlatforms: PromotePlatform[],
): QueueItemPlatformRow[] {
  const connectionByPlatform = new Map(connections.map((c) => [c.platform, c]))
  const targetByPlatform = new Map(existingTargets.map((t) => [t.platform, t]))
  const selected = new Set(selectedPlatforms)

  return PROMOTE_PLATFORM_DEFS.map((def) => {
    const connection = connectionByPlatform.get(def.id)
    const target = targetByPlatform.get(def.id)
    const published = publishedByPlatform.get(def.id)
    const supportsShape = platformSupportsShape(def.id, shapeId)
    const connected = connection?.status === 'connected'

    let state: QueueItemPlatformState
    if (target && IMMUTABLE_TARGET_STATUSES.has(target.status)) {
      state = target.status === 'published' ? 'published' : 'locked'
    } else if (!def.live) {
      state = 'coming_soon'
    } else if (!supportsShape) {
      state = 'wrong_shape'
    } else if (!connected) {
      state = 'not_connected'
    } else if (published) {
      state = 'already_published'
    } else {
      state = 'selectable'
    }

    return {
      id: def.id,
      label: def.label,
      live: def.live,
      state,
      shapeHint: shapeRequirementHint(def.id, shapeId),
      connected,
      publishedAt: published?.publishedAt ?? target?.published_at ?? null,
      externalPostUrl: published?.externalPostUrl ?? target?.external_post_url ?? null,
      targetStatus: target?.status ?? null,
    }
  })
}

/** Drop selections that are not eligible for the current shape/connection state. */
export function pruneSelectedPlatforms(
  shapeId: MomentShapeId,
  connections: ConnectionRow[],
  selectedPlatforms: PromotePlatform[],
): PromotePlatform[] {
  const connectionByPlatform = new Map(connections.map((c) => [c.platform, c]))
  return selectedPlatforms.filter((platform) => {
    const def = PROMOTE_PLATFORM_DEFS.find((p) => p.id === platform)
    if (!def?.live) return false
    if (!platformSupportsShape(platform, shapeId)) return false
    return connectionByPlatform.get(platform)?.status === 'connected'
  })
}

export interface QueueTargetSyncRow {
  platform: PromotePlatform
  connection_id: string | null
  status: 'pending' | 'skipped'
  error_message: string | null
}

export function buildQueueTargetSyncRows(
  shapeId: MomentShapeId,
  selectedPlatforms: PromotePlatform[],
  connections: ConnectionRow[],
  existingTargets: ExistingTargetRow[],
): QueueTargetSyncRow[] {
  const connectionByPlatform = new Map(connections.map((c) => [c.platform, c]))
  const targetByPlatform = new Map(existingTargets.map((t) => [t.platform, t]))
  const selected = new Set(selectedPlatforms)

  const platformsToSync = new Set<PromotePlatform>()
  for (const def of PROMOTE_PLATFORM_DEFS) {
    if (def.live && platformSupportsShape(def.id, shapeId)) {
      platformsToSync.add(def.id)
    }
  }
  for (const target of existingTargets) {
    platformsToSync.add(target.platform)
  }

  const rows: QueueTargetSyncRow[] = []
  for (const platform of platformsToSync) {
    const def = PROMOTE_PLATFORM_DEFS.find((p) => p.id === platform)
    const existing = targetByPlatform.get(platform)
    if (existing && IMMUTABLE_TARGET_STATUSES.has(existing.status)) {
      continue
    }

    const connection = connectionByPlatform.get(platform)
    const connected = connection?.status === 'connected'
    const supportsShape = platformSupportsShape(platform, shapeId)
    const userSelected = selected.has(platform)

    if (!def?.live) {
      rows.push({
        platform,
        connection_id: connection?.id ?? null,
        status: 'skipped',
        error_message: `${def?.label ?? platform} is not available yet.`,
      })
      continue
    }

    if (!supportsShape) {
      rows.push({
        platform,
        connection_id: connection?.id ?? null,
        status: 'skipped',
        error_message: shapeRequirementHint(platform, shapeId),
      })
      continue
    }

    if (!connected) {
      rows.push({
        platform,
        connection_id: null,
        status: 'skipped',
        error_message: connectPlatformMessage(platform),
      })
      continue
    }

    if (!userSelected) {
      rows.push({
        platform,
        connection_id: connection!.id,
        status: 'skipped',
        error_message: null,
      })
      continue
    }

    rows.push({
      platform,
      connection_id: connection!.id,
      status: 'pending',
      error_message: null,
    })
  }

  return rows
}

export function hasPublishableSelection(rows: QueueItemPlatformRow[], selected: PromotePlatform[]): boolean {
  const selectedSet = new Set(selected)
  return rows.some((row) => selectedSet.has(row.id) && row.state === 'selectable')
}

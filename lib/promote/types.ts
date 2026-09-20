import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentShapeId, MomentThemeId } from '@/lib/moment/types'

export type PromotePlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x'

export type PromotePublishMode = 'auto' | 'review'

export type PromoteCadence = 'daily' | 'weekly' | 'manual'

export type PromoteQueueStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'publishing'
  | 'published'
  | 'partial'
  | 'failed'
  | 'rejected'
  | 'cancelled'

export type PromoteTargetStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'skipped'

export type SocialConnectionStatus = 'connected' | 'expired' | 'revoked' | 'error'

export interface ArtistPromoteSettings {
  profileId: string
  publishMode: PromotePublishMode
  enabled: boolean
  cadence: PromoteCadence
  maxPostsPerRun: number
  lastRunAt: string | null
  nextRunAt: string | null
}

export interface SocialConnectionPublic {
  id: string
  platform: PromotePlatform
  status: SocialConnectionStatus
  externalAccountId: string | null
  externalUsername: string | null
  connectedAt: string
  lastPublishAt: string | null
  lastError: string | null
}

export interface PromoteQueueRow {
  id: string
  profileId: string
  status: PromoteQueueStatus
  sourceType: 'existing_moment' | 'catalog_line'
  sourcePostId: string | null
  lyricText: string
  songTitle: string
  artistName: string
  artworkUrl: string | null
  defaultShapeId: MomentShapeId
  defaultThemeId: MomentThemeId
  defaultAtmosphereId: AtmosphereId
  overrideShapeId: MomentShapeId | null
  overrideThemeId: MomentThemeId | null
  overrideAtmosphereId: AtmosphereId | null
  renderedVideoUrl: string | null
  reviewedAt: string | null
  createdAt: string
  targets: PromoteQueueTargetRow[]
}

export interface PromoteQueueTargetRow {
  id: string
  platform: PromotePlatform
  status: PromoteTargetStatus
  externalPostId: string | null
  externalPostUrl: string | null
  errorMessage: string | null
  publishedAt: string | null
}

export interface PostExportPrefs {
  exportShapeId: MomentShapeId
  exportThemeId: MomentThemeId
  exportAtmosphereId: AtmosphereId
}

export function resolveQueueVisualPrefs(row: Pick<
  PromoteQueueRow,
  | 'defaultShapeId'
  | 'defaultThemeId'
  | 'defaultAtmosphereId'
  | 'overrideShapeId'
  | 'overrideThemeId'
  | 'overrideAtmosphereId'
>): PostExportPrefs {
  return {
    exportShapeId: row.overrideShapeId ?? row.defaultShapeId,
    exportThemeId: row.overrideThemeId ?? row.defaultThemeId,
    exportAtmosphereId: row.overrideAtmosphereId ?? row.defaultAtmosphereId,
  }
}

/** Vertical → YouTube (Phase 1). Square skipped until those platforms ship. */
export function platformsForShape(shapeId: MomentShapeId): PromotePlatform[] {
  if (shapeId === 'vertical') return ['youtube']
  return []
}

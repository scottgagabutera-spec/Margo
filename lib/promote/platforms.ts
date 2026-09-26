import { EXPORT_SHAPE_HINTS, EXPORT_SHAPE_LABELS } from '@/lib/moment-export/export-shapes'
import type { MomentShapeId } from '@/lib/moment/types'
import type { PromotePlatform } from '@/lib/promote/types'

export interface PromotePlatformDef {
  id: PromotePlatform
  label: string
  /** Whether OAuth connect + server publish is implemented. */
  live: boolean
  /** Shapes this platform accepts for auto-promote. */
  shapes: MomentShapeId[]
  /** OAuth start path when live. */
  oauthPath?: string
}

export type PromotePlatformPickerState =
  | 'selectable'
  | 'selected'
  | 'wrong_shape'
  | 'not_connected'
  | 'coming_soon'
  | 'already_published'

/** Single source of truth for promote destinations — add platforms here as they ship. */
export const PROMOTE_PLATFORM_DEFS: PromotePlatformDef[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    live: true,
    shapes: ['vertical'],
    oauthPath: '/api/promote/oauth/youtube',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    live: true,
    shapes: ['vertical'],
    oauthPath: '/api/promote/oauth/tiktok',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    live: false,
    shapes: ['vertical'],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    live: false,
    shapes: ['vertical'],
    oauthPath: '/api/promote/oauth/facebook',
  },
  {
    id: 'x',
    label: 'X',
    live: false,
    shapes: ['vertical', 'wide'],
  },
]

export function getPromotePlatformDef(platform: PromotePlatform): PromotePlatformDef | undefined {
  return PROMOTE_PLATFORM_DEFS.find((p) => p.id === platform)
}

/** All platforms that support this export shape (live + coming soon). */
export function platformsForShape(shapeId: MomentShapeId): PromotePlatform[] {
  return PROMOTE_PLATFORM_DEFS
    .filter((p) => p.shapes.includes(shapeId))
    .map((p) => p.id)
}

/** Platforms we can actually queue + publish to today. */
export function livePlatformsForShape(shapeId: MomentShapeId): PromotePlatform[] {
  return PROMOTE_PLATFORM_DEFS
    .filter((p) => p.live && p.shapes.includes(shapeId))
    .map((p) => p.id)
}

export function isPromotePlatformLive(platform: PromotePlatform): boolean {
  return PROMOTE_PLATFORM_DEFS.some((p) => p.id === platform && p.live)
}

/** UI defs for a shape — every destination the artist will eventually reach from Margo. */
export function promotePlatformsForUi(shapeId: MomentShapeId): PromotePlatformDef[] {
  return PROMOTE_PLATFORM_DEFS.filter((p) => p.shapes.includes(shapeId))
}

export function formatPlatformLabels(platforms: PromotePlatform[]): string {
  const labels = platforms
    .map((id) => getPromotePlatformDef(id)?.label ?? id)
    .filter(Boolean)
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

/** Short copy for export / queue surfaces. */
export function promoteDestinationSummary(shapeId: MomentShapeId): string {
  const all = promotePlatformsForUi(shapeId)
  const live = all.filter((p) => p.live)
  const upcoming = all.filter((p) => !p.live)

  if (live.length === 0) {
    return 'More platforms are on the way.'
  }

  const livePart = formatPlatformLabels(live.map((p) => p.id))
  if (upcoming.length === 0) {
    return `Publishes to ${livePart}.`
  }

  const upcomingPart = formatPlatformLabels(upcoming.map((p) => p.id))
  return `Publishes to all connected platforms — ${livePart} today; ${upcomingPart} coming soon.`
}

export function connectPlatformMessage(platform: PromotePlatform): string {
  const label = getPromotePlatformDef(platform)?.label ?? platform
  return `Connect ${label} in Settings before publishing.`
}

export function platformSupportsShape(platform: PromotePlatform, shapeId: MomentShapeId): boolean {
  return getPromotePlatformDef(platform)?.shapes.includes(shapeId) ?? false
}

export function requiredShapeLabels(platform: PromotePlatform): string {
  const def = getPromotePlatformDef(platform)
  if (!def?.shapes.length) return ''
  return def.shapes.map((s) => `${EXPORT_SHAPE_LABELS[s]} (${EXPORT_SHAPE_HINTS[s]})`).join(' or ')
}

export function shapeRequirementHint(platform: PromotePlatform, shapeId: MomentShapeId): string | null {
  if (platformSupportsShape(platform, shapeId)) return null
  return `Needs ${requiredShapeLabels(platform)}`
}

export function validateSelectedPlatforms(
  shapeId: MomentShapeId,
  platforms: PromotePlatform[],
): { ok: true } | { ok: false; error: string } {
  if (platforms.length === 0) {
    return { ok: false, error: 'Select at least one platform.' }
  }
  for (const platform of platforms) {
    if (!isPromotePlatformLive(platform)) {
      const label = getPromotePlatformDef(platform)?.label ?? platform
      return { ok: false, error: `${label} is not available yet.` }
    }
    if (!platformSupportsShape(platform, shapeId)) {
      const label = getPromotePlatformDef(platform)?.label ?? platform
      return { ok: false, error: `${label} requires ${requiredShapeLabels(platform)} for this export.` }
    }
  }
  return { ok: true }
}

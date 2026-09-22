import { PROMOTE_PLATFORM_DEFS } from '@/lib/promote/platforms'
import type { PromotePlatform } from '@/lib/promote/types'

/** Margo platform ids — any Buffer channel whose service resolves here can publish without new code. */
const MARGO_PLATFORM_IDS = new Set<PromotePlatform>(
  PROMOTE_PLATFORM_DEFS.map((p) => p.id),
)

/**
 * Buffer `service` strings that differ from Margo platform ids.
 * Add aliases here only when Buffer's name ≠ ours (e.g. twitter → x).
 */
const BUFFER_SERVICE_ALIASES: Record<string, PromotePlatform> = {
  twitter: 'x',
}

/** YouTube always uses direct OAuth in Margo — never route through Buffer. */
const BUFFER_EXCLUDED: ReadonlySet<string> = new Set(['youtube'])

export interface BufferChannelSnapshot {
  id: string
  service: string
  name: string
  displayName?: string | null
}

/**
 * Map a Buffer channel `service` field to a Margo PromotePlatform, if supported.
 * Returns null for unknown services or platforms Margo does not promote to.
 */
export function bufferServiceToPlatform(service: string): PromotePlatform | null {
  const normalized = service.trim().toLowerCase()
  if (!normalized || BUFFER_EXCLUDED.has(normalized)) return null

  if (MARGO_PLATFORM_IDS.has(normalized as PromotePlatform)) {
    return normalized as PromotePlatform
  }

  const aliased = BUFFER_SERVICE_ALIASES[normalized]
  if (aliased && MARGO_PLATFORM_IDS.has(aliased)) return aliased

  return null
}

/** Group synced Buffer channels by resolved Margo platform (first channel wins per platform). */
export function mapBufferChannelsByPlatform(
  channels: BufferChannelSnapshot[],
): Map<PromotePlatform, BufferChannelSnapshot> {
  const byPlatform = new Map<PromotePlatform, BufferChannelSnapshot>()
  for (const channel of channels) {
    const platform = bufferServiceToPlatform(channel.service)
    if (!platform || byPlatform.has(platform)) continue
    byPlatform.set(platform, channel)
  }
  return byPlatform
}

export function bufferBackedPlatforms(channels: BufferChannelSnapshot[]): PromotePlatform[] {
  return [...mapBufferChannelsByPlatform(channels).keys()]
}

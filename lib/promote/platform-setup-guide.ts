import type { PromotePlatform } from '@/lib/promote/types'
import { getPromotePlatformDef } from '@/lib/promote/platforms'

export interface PlatformSetupGuide {
  artistSteps: string[]
  margoStatus: string
}

/** What the artist does vs what Margo still needs to ship. */
export const PLATFORM_SETUP_GUIDES: Record<PromotePlatform, PlatformSetupGuide> = {
  youtube: {
    margoStatus: 'Connect your YouTube channel for Shorts auto-promote.',
    artistSteps: [],
  },
  tiktok: {
    margoStatus: 'Connect TikTok for Shorts auto-promote (app review in progress).',
    artistSteps: [],
  },
  instagram: {
    margoStatus: 'Coming soon.',
    artistSteps: [],
  },
  facebook: {
    margoStatus: 'Coming soon.',
    artistSteps: [],
  },
  x: {
    margoStatus: 'Coming soon.',
    artistSteps: [],
  },
}

export function getPlatformSetupGuide(platform: PromotePlatform): PlatformSetupGuide {
  return PLATFORM_SETUP_GUIDES[platform] ?? {
    margoStatus: 'Coming soon.',
    artistSteps: [`Connect ${getPromotePlatformDef(platform)?.label ?? platform} when available.`],
  }
}

import type { PromotePlatform } from '@/lib/promote/types'
import { getPromotePlatformDef } from '@/lib/promote/platforms'

export interface PlatformSetupGuide {
  artistSteps: string[]
  margoStatus: string
}

/** What the artist does vs what Margo still needs to ship. */
export const PLATFORM_SETUP_GUIDES: Record<PromotePlatform, PlatformSetupGuide> = {
  youtube: {
    margoStatus: 'Live — connect your channel below.',
    artistSteps: [
      'Use the same Google account that owns your YouTube channel.',
      'Approve upload access when Google asks.',
      'Export as Shorts (9:16) before promoting.',
    ],
  },
  tiktok: {
    margoStatus: 'Coming soon — Margo is finishing TikTok posting API setup.',
    artistSteps: [
      'Make sure your TikTok is a Business or Creator account.',
      'When Margo launches TikTok, connect here — no need to re-enter lyrics.',
      'Shorts (9:16) export will map to TikTok vertical video.',
    ],
  },
  instagram: {
    margoStatus: 'Coming soon — Margo is wiring Instagram Reels via Meta.',
    artistSteps: [
      'Link Instagram to a Facebook Page (Meta requirement for API posting).',
      'Use a Professional account on Instagram.',
      'Shorts (9:16) export will map to Reels.',
    ],
  },
  facebook: {
    margoStatus: 'Coming soon — Margo is wiring Facebook Page video posts.',
    artistSteps: [
      'You will connect a Facebook Page you manage (not a personal profile).',
      'Shorts (9:16) export will map to Facebook Reels.',
    ],
  },
  x: {
    margoStatus: 'Coming soon — Margo is wiring X (Twitter) video posts.',
    artistSteps: [
      'Connect the X account you post music from.',
      'Shorts (9:16) works for vertical posts; Wide (16:9) for landscape clips.',
    ],
  },
}

export function getPlatformSetupGuide(platform: PromotePlatform): PlatformSetupGuide {
  return PLATFORM_SETUP_GUIDES[platform] ?? {
    margoStatus: 'Coming soon.',
    artistSteps: [`Connect ${getPromotePlatformDef(platform)?.label ?? platform} when available.`],
  }
}

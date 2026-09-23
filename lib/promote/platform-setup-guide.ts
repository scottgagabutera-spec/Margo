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
    margoStatus: 'In review — OAuth and publish are built; waiting on TikTok app approval before going live.',
    artistSteps: [
      'Use a TikTok Business or Creator account.',
      'Margo will connect via Login Kit once TikTok approves video.publish.',
      'Shorts (9:16) export maps to TikTok vertical video (PULL_FROM_URL from Margo staging).',
      'Verify audio.trymargo.com URL prefix in your TikTok app before publish works.',
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
    margoStatus: 'Live — connect a Facebook Page you manage (not a personal profile).',
    artistSteps: [
      'You must admin the Facebook Page you connect.',
      'Personal profiles cannot be used for Auto-Promote.',
      'Shorts (9:16) export maps to Page video posts.',
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

import { getValidYouTubeAccessToken } from '@/lib/promote/connections'
import { isPromotePlatformDirectLive } from '@/lib/promote/platforms'
import { buildYouTubePromoteCopy, isMargoArtistAccount } from '@/lib/promote/youtube-copy'
import { uploadVideoToYouTube } from '@/lib/promote/youtube-publish'
import type { PublishAdapter, PublishAdapterContext, PlatformPublishResult } from '@/lib/promote/adapters/types'

async function publishDirect(ctx: PublishAdapterContext): Promise<PlatformPublishResult> {
  const { admin, platform, connection, videoBytes, input } = ctx

  if (!isPromotePlatformDirectLive(platform)) {
    throw new Error(`${platform} direct promotion is not available yet`)
  }
  if (!connection) {
    throw new Error(`Connect ${platform} in Settings before publishing.`)
  }

  switch (platform) {
    case 'youtube': {
      const { title, description } = buildYouTubePromoteCopy({
        songTitle: input.songTitle,
        lyricText: input.lyricText,
      })
      const accessToken = await getValidYouTubeAccessToken(admin, connection)
      const result = await uploadVideoToYouTube({
        accessToken,
        videoBytes,
        title,
        description,
        privacyStatus: input.privacyStatus ?? 'public',
        containsSyntheticMedia: isMargoArtistAccount(input.publisherUsername) || undefined,
      })
      return {
        platform,
        postId: result.videoId,
        postUrl: result.videoUrl,
      }
    }
    default:
      throw new Error(`${platform} direct promotion is not available yet`)
  }
}

export const directPublishAdapter: PublishAdapter = {
  kind: 'direct',
  publish: publishDirect,
}

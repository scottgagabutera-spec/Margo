import type { SupabaseClient } from '@supabase/supabase-js'
import { getFacebookPageAccessToken, getValidYouTubeAccessToken } from '@/lib/promote/connections'
import { buildFacebookPromoteCopy } from '@/lib/promote/facebook-copy'
import { uploadVideoToFacebookPage } from '@/lib/promote/facebook-publish'
import { isPromotePlatformLive } from '@/lib/promote/platforms'
import { buildYouTubePromoteCopy, isMargoArtistAccount } from '@/lib/promote/youtube-copy'
import { uploadVideoToYouTube } from '@/lib/promote/youtube-publish'
import type { PromotePlatform } from '@/lib/promote/types'

type ConnectionRow = {
  id: string
  profile_id: string
  platform: PromotePlatform
  status: string
  external_account_id: string | null
  external_username: string | null
  access_token_enc: string
  refresh_token_enc: string | null
  token_expires_at: string | null
  scopes: string[] | null
  connected_at: string
  last_publish_at: string | null
  last_error: string | null
}

export interface PlatformPublishInput {
  songTitle: string
  lyricText: string
  artistName: string
  publisherUsername?: string | null
  privacyStatus?: 'public' | 'unlisted' | 'private'
}

export interface PlatformPublishResult {
  platform: PromotePlatform
  postId: string
  postUrl: string
}

export async function publishVideoToPlatform(
  admin: SupabaseClient,
  platform: PromotePlatform,
  connection: ConnectionRow,
  videoBytes: Buffer,
  input: PlatformPublishInput,
): Promise<PlatformPublishResult> {
  if (!isPromotePlatformLive(platform)) {
    throw new Error(`${platform} promotion is not available yet`)
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
    case 'facebook': {
      const { title, description } = buildFacebookPromoteCopy({
        songTitle: input.songTitle,
        lyricText: input.lyricText,
        artistName: input.artistName,
      })
      const pageId = connection.external_account_id
      if (!pageId) throw new Error('Facebook Page id missing — reconnect in Settings.')
      const accessToken = getFacebookPageAccessToken(connection)
      const result = await uploadVideoToFacebookPage({
        pageId,
        accessToken,
        videoBytes,
        title,
        description,
      })
      return {
        platform,
        postId: result.videoId,
        postUrl: result.videoUrl,
      }
    }
    default:
      throw new Error(`${platform} promotion is not available yet`)
  }
}

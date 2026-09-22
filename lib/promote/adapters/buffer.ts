import {
  fetchArtistBufferConnection,
  getValidBufferAccessToken,
} from '@/lib/promote/buffer/connections'
import { publishVideoViaBuffer } from '@/lib/promote/buffer/publish'
import { mapBufferChannelsByPlatform } from '@/lib/promote/buffer/service-map'
import type { PublishAdapter, PublishAdapterContext, PlatformPublishResult } from '@/lib/promote/adapters/types'

function resolveBufferChannelId(ctx: PublishAdapterContext): string {
  const fromConnection = ctx.connection?.external_account_id
    || (typeof ctx.connection?.platform_meta?.bufferChannelId === 'string'
      ? ctx.connection.platform_meta.bufferChannelId
      : null)
  if (fromConnection) return fromConnection

  throw new Error(`No Buffer channel mapped for ${ctx.platform} — sync channels in Settings.`)
}

async function publishBuffer(ctx: PublishAdapterContext): Promise<PlatformPublishResult> {
  const { admin, profileId, platform, videoPublicUrl, input } = ctx

  const bufferConnection = await fetchArtistBufferConnection(admin, profileId)
  if (!bufferConnection || bufferConnection.status !== 'connected') {
    throw new Error('Connect Buffer in Settings before publishing.')
  }

  const channels = bufferConnection.channels ?? []
  const byPlatform = mapBufferChannelsByPlatform(channels)
  const channel = byPlatform.get(platform)
  const channelId = channel?.id ?? resolveBufferChannelId(ctx)

  const accessToken = await getValidBufferAccessToken(admin, bufferConnection)
  const result = await publishVideoViaBuffer({
    accessToken,
    channelId,
    videoPublicUrl,
    songTitle: input.songTitle,
    lyricText: input.lyricText,
    artistName: input.artistName,
  })

  return {
    platform,
    postId: result.postId,
    postUrl: result.postUrl,
  }
}

export const bufferPublishAdapter: PublishAdapter = {
  kind: 'buffer',
  publish: publishBuffer,
}

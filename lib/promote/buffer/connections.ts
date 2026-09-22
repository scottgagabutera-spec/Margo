import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllBufferChannels } from '@/lib/promote/buffer/channels'
import { refreshBufferAccessToken } from '@/lib/promote/buffer/oauth'
import {
  bufferServiceToPlatform,
  type BufferChannelSnapshot,
} from '@/lib/promote/buffer/service-map'
import { decryptPromoteToken, encryptPromoteToken } from '@/lib/promote/token-vault'
import type { PromotePlatform } from '@/lib/promote/types'

export type BufferConnectionRow = {
  profile_id: string
  status: string
  access_token_enc: string
  refresh_token_enc: string | null
  token_expires_at: string | null
  organization_id: string | null
  channels: BufferChannelSnapshot[] | null
  channels_synced_at: string | null
  connected_at: string
  last_error: string | null
}

const BUFFER_VIA_TOKEN = 'via-buffer'

export async function fetchArtistBufferConnection(
  admin: SupabaseClient,
  profileId: string,
): Promise<BufferConnectionRow | null> {
  const { data } = await admin
    .from('artist_buffer_connections')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (!data) return null
  return {
    ...data,
    channels: Array.isArray(data.channels) ? data.channels as BufferChannelSnapshot[] : [],
  } as BufferConnectionRow
}

export async function getValidBufferAccessToken(
  admin: SupabaseClient,
  connection: BufferConnectionRow,
): Promise<string> {
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at).getTime()
    : 0
  const stillValid = expiresAt - Date.now() > 60_000

  if (stillValid) {
    return decryptPromoteToken(connection.access_token_enc)
  }

  if (!connection.refresh_token_enc) {
    await admin
      .from('artist_buffer_connections')
      .update({ status: 'expired', last_error: 'Buffer refresh token missing — reconnect in Settings.' })
      .eq('profile_id', connection.profile_id)
    throw new Error('Buffer connection expired')
  }

  try {
    const refreshToken = decryptPromoteToken(connection.refresh_token_enc)
    const tokens = await refreshBufferAccessToken(refreshToken)
    const accessEnc = encryptPromoteToken(tokens.access_token)
    const refreshEnc = tokens.refresh_token
      ? encryptPromoteToken(tokens.refresh_token)
      : connection.refresh_token_enc
    const expires = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await admin
      .from('artist_buffer_connections')
      .update({
        access_token_enc: accessEnc,
        refresh_token_enc: refreshEnc,
        token_expires_at: expires,
        status: 'connected',
        last_error: null,
      })
      .eq('profile_id', connection.profile_id)

    return tokens.access_token
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buffer token refresh failed'
    await admin
      .from('artist_buffer_connections')
      .update({ status: 'expired', last_error: message })
      .eq('profile_id', connection.profile_id)
    throw err
  }
}

/** Upsert artist_social_connections rows for each Buffer channel mapped to a Margo platform. */
export async function syncBufferChannelsToSocialConnections(
  admin: SupabaseClient,
  profileId: string,
  channels: BufferChannelSnapshot[],
): Promise<PromotePlatform[]> {
  const syncedPlatforms: PromotePlatform[] = []
  const placeholderToken = encryptPromoteToken(BUFFER_VIA_TOKEN)
  const now = new Date().toISOString()

  for (const channel of channels) {
    const platform = bufferServiceToPlatform(channel.service)
    if (!platform) continue

    syncedPlatforms.push(platform)

    const { data: existing } = await admin
      .from('artist_social_connections')
      .select('id, publish_adapter')
      .eq('profile_id', profileId)
      .eq('platform', platform)
      .maybeSingle()

    // Respect an existing direct OAuth connection — do not overwrite with Buffer.
    if (existing?.publish_adapter === 'direct') continue

    const row = {
      profile_id: profileId,
      platform,
      status: 'connected' as const,
      publish_adapter: 'buffer' as const,
      external_account_id: channel.id,
      external_username: channel.displayName || channel.name,
      access_token_enc: placeholderToken,
      refresh_token_enc: null,
      token_expires_at: null,
      scopes: [] as string[],
      platform_meta: {
        bufferChannelId: channel.id,
        bufferService: channel.service,
        channelName: channel.name,
      },
      connected_at: now,
      last_error: null,
    }

    await admin
      .from('artist_social_connections')
      .upsert(row, { onConflict: 'profile_id,platform' })
  }

  return syncedPlatforms
}

export async function syncArtistBufferChannels(
  admin: SupabaseClient,
  profileId: string,
): Promise<{ organizationId: string | null; channels: BufferChannelSnapshot[] }> {
  const connection = await fetchArtistBufferConnection(admin, profileId)
  if (!connection || connection.status !== 'connected') {
    throw new Error('Buffer is not connected')
  }

  const accessToken = await getValidBufferAccessToken(admin, connection)
  const { organizationId, channels } = await fetchAllBufferChannels(accessToken)
  const now = new Date().toISOString()

  await admin
    .from('artist_buffer_connections')
    .update({
      organization_id: organizationId,
      channels,
      channels_synced_at: now,
      last_error: null,
    })
    .eq('profile_id', profileId)

  await syncBufferChannelsToSocialConnections(admin, profileId, channels)

  return { organizationId, channels }
}

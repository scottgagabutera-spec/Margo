import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptPromoteToken, encryptPromoteToken } from '@/lib/promote/token-vault'
import { refreshYouTubeAccessToken } from '@/lib/promote/youtube-oauth'
import type { PromotePlatform, SocialConnectionPublic } from '@/lib/promote/types'

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

export function mapConnectionPublic(row: ConnectionRow): SocialConnectionPublic {
  return {
    id: row.id,
    platform: row.platform,
    status: row.status as SocialConnectionPublic['status'],
    externalAccountId: row.external_account_id,
    externalUsername: row.external_username,
    connectedAt: row.connected_at,
    lastPublishAt: row.last_publish_at,
    lastError: row.last_error,
  }
}

export function getFacebookPageAccessToken(connection: ConnectionRow): string {
  return decryptPromoteToken(connection.access_token_enc)
}

export async function getValidYouTubeAccessToken(
  admin: SupabaseClient,
  connection: ConnectionRow,
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
      .from('artist_social_connections')
      .update({ status: 'expired', last_error: 'YouTube refresh token missing — reconnect in Settings.' })
      .eq('id', connection.id)
    throw new Error('YouTube connection expired')
  }

  try {
    const refreshToken = decryptPromoteToken(connection.refresh_token_enc)
    const tokens = await refreshYouTubeAccessToken(refreshToken)
    const accessEnc = encryptPromoteToken(tokens.access_token)
    const expires = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    await admin
      .from('artist_social_connections')
      .update({
        access_token_enc: accessEnc,
        token_expires_at: expires,
        status: 'connected',
        last_error: null,
      })
      .eq('id', connection.id)
    return tokens.access_token
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed'
    await admin
      .from('artist_social_connections')
      .update({ status: 'expired', last_error: message })
      .eq('id', connection.id)
    throw err
  }
}

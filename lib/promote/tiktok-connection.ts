import type { SupabaseClient } from '@supabase/supabase-js'
import { TIKTOK_PROMOTE_SCOPES } from '@/lib/promote/tiktok-oauth'
import { encryptPromoteToken } from '@/lib/promote/token-vault'
import type { TikTokTokenResponse, TikTokUserInfo } from '@/lib/promote/tiktok-oauth'

export async function saveTikTokConnection(
  admin: SupabaseClient,
  profileId: string,
  tokens: TikTokTokenResponse,
  user: TikTokUserInfo,
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const row = {
    profile_id: profileId,
    platform: 'tiktok' as const,
    status: 'connected' as const,
    external_account_id: user.openId,
    external_username: user.username ? `@${user.username}` : user.displayName,
    access_token_enc: encryptPromoteToken(tokens.access_token),
    refresh_token_enc: encryptPromoteToken(tokens.refresh_token),
    token_expires_at: expiresAt,
    scopes: tokens.scope.split(',').map((s) => s.trim()).filter(Boolean),
    platform_meta: {
      openId: user.openId,
      displayName: user.displayName,
      username: user.username,
      refreshExpiresIn: tokens.refresh_expires_in,
    },
    connected_at: new Date().toISOString(),
    last_error: null,
  }

  const { error } = await admin
    .from('artist_social_connections')
    .upsert(row, { onConflict: 'profile_id,platform' })

  if (error) throw error

  await admin
    .from('artist_promote_settings')
    .upsert({ profile_id: profileId }, { onConflict: 'profile_id' })
}

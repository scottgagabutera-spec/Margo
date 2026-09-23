import type { SupabaseClient } from '@supabase/supabase-js'
import { FACEBOOK_PROMOTE_SCOPES } from '@/lib/promote/facebook-oauth'
import { encryptPromoteToken } from '@/lib/promote/token-vault'
import type { FacebookPageOption } from '@/lib/promote/facebook-oauth'

export async function saveFacebookPageConnection(
  admin: SupabaseClient,
  profileId: string,
  page: FacebookPageOption,
  userLongLivedToken?: string | null,
): Promise<void> {
  const row = {
    profile_id: profileId,
    platform: 'facebook' as const,
    status: 'connected' as const,
    external_account_id: page.id,
    external_username: page.name,
    access_token_enc: encryptPromoteToken(page.accessToken),
    refresh_token_enc: userLongLivedToken ? encryptPromoteToken(userLongLivedToken) : null,
    token_expires_at: null,
    scopes: FACEBOOK_PROMOTE_SCOPES.split(','),
    platform_meta: {
      pageId: page.id,
      pageName: page.name,
      accountType: 'page',
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

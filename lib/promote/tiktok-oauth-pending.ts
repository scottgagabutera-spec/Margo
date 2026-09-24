import type { SupabaseClient } from '@supabase/supabase-js'

const PENDING_TTL_MS = 10 * 60 * 1000

export interface TikTokOAuthPendingRow {
  profile_id: string
  return_to: string
}

export async function createTikTokOAuthPending(
  admin: SupabaseClient,
  state: string,
  profileId: string,
  returnTo: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS).toISOString()
  const { error } = await admin.from('promote_tiktok_oauth_pending').upsert(
    {
      state,
      profile_id: profileId,
      return_to: returnTo,
      expires_at: expiresAt,
    },
    { onConflict: 'state' },
  )
  if (error) throw error
}

/** One-time consume: deletes the row when valid and not expired. */
export async function consumeTikTokOAuthPending(
  admin: SupabaseClient,
  state: string,
): Promise<TikTokOAuthPendingRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('promote_tiktok_oauth_pending')
    .select('profile_id, return_to')
    .eq('state', state)
    .gt('expires_at', now)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  await admin.from('promote_tiktok_oauth_pending').delete().eq('state', state)

  const returnTo =
    data.return_to.startsWith('/') && !data.return_to.startsWith('//')
      ? data.return_to
      : '/settings'

  return { profile_id: data.profile_id, return_to: returnTo }
}

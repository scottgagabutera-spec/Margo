import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptPromoteToken } from '@/lib/promote/token-vault'

const PENDING_TTL_MS = 10 * 60 * 1000

export type FacebookPagePendingPayload = {
  userAccessToken: string
  pages: Array<{ id: string; name: string; accessToken: string }>
}

export async function saveFacebookPagePending(
  admin: SupabaseClient,
  profileId: string,
  payloadEnc: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS).toISOString()
  const { error } = await admin.from('promote_facebook_page_pending').upsert(
    {
      profile_id: profileId,
      payload_enc: payloadEnc,
      expires_at: expiresAt,
    },
    { onConflict: 'profile_id' },
  )
  if (error) throw error
}

export async function loadFacebookPagePending(
  admin: SupabaseClient,
  profileId: string,
): Promise<FacebookPagePendingPayload | null> {
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('promote_facebook_page_pending')
    .select('payload_enc')
    .eq('profile_id', profileId)
    .gt('expires_at', now)
    .maybeSingle()

  if (error) throw error
  if (!data?.payload_enc) return null

  try {
    return JSON.parse(decryptPromoteToken(data.payload_enc)) as FacebookPagePendingPayload
  } catch {
    return null
  }
}

export async function clearFacebookPagePending(
  admin: SupabaseClient,
  profileId: string,
): Promise<void> {
  await admin.from('promote_facebook_page_pending').delete().eq('profile_id', profileId)
}

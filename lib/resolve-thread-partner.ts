import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchProfilePeek } from '@/lib/profile-warm'
import { isPartnerUuid } from '@/lib/messages/partner-key'

export type ThreadPartnerRow = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  whoCanMessage: string
}

/**
 * Load a DM partner when RLS may hide private profiles (uses profile_peek fallback).
 */
export async function resolveThreadPartner(
  supabase: SupabaseClient,
  partnerKey: string,
): Promise<ThreadPartnerRow | null> {
  if (isPartnerUuid(partnerKey)) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, who_can_message')
      .eq('id', partnerKey)
      .maybeSingle()
    if (data) {
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        whoCanMessage: data.who_can_message,
      }
    }
    return null
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, who_can_message')
    .eq('username', partnerKey)
    .maybeSingle()

  if (data) {
    return {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      whoCanMessage: data.who_can_message,
    }
  }

  const peek = await fetchProfilePeek(partnerKey)
  if (!peek) return null

  return {
    id: peek.profile.id,
    username: peek.profile.username,
    displayName: peek.profile.displayName,
    avatarUrl: peek.profile.avatarUrl,
    whoCanMessage: peek.profile.whoCanMessage,
  }
}

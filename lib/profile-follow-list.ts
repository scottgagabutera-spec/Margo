import { createClient } from '@/lib/supabase/client'

export type FollowListKind = 'followers' | 'following'

export interface FollowListPerson {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  isArtist: boolean
  isPrivate?: boolean
}

export type FollowListResult =
  | {
      ok: true
      kind: FollowListKind
      username: string
      displayName: string
      listsPrivate: boolean
      isOwner: boolean
      total: number
      items: FollowListPerson[]
    }
  | {
      ok: false
      error: 'not_found' | 'private_profile' | 'lists_private' | 'invalid_kind' | string
      username?: string
      displayName?: string
    }

export async function fetchProfileFollowList(
  username: string,
  kind: FollowListKind,
): Promise<FollowListResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('list_profile_follows', {
    p_username: username,
    p_kind: kind,
    p_limit: 80,
    p_offset: 0,
  })
  if (error || !data || typeof data !== 'object') {
    return { ok: false, error: error?.message || 'unavailable' }
  }
  const row = data as FollowListResult
  if (!row.ok) return row
  return {
    ...row,
    items: Array.isArray(row.items) ? row.items : [],
  }
}

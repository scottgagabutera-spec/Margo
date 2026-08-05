import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProfileSearchHit {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  isArtist: boolean
  artistStatus: 'active' | 'warned' | 'frozen' | 'removed' | null
}

function sanitizeIlike(query: string): string {
  return (query || '').replace(/[%_"'\\]/g, '').trim()
}

/**
 * Search public profiles by username or display name.
 * Honors profiles RLS (private accounts stay hidden from non-followers).
 */
export async function searchProfiles(
  supabase: SupabaseClient,
  query: string,
  limit = 8
): Promise<ProfileSearchHit[]> {
  const q = sanitizeIlike(query)
  if (q.length < 2) return []

  const pattern = `%${q}%`
  const select = 'id, username, display_name, avatar_url, is_artist, artist_status'

  const [byUsername, byDisplay] = await Promise.all([
    supabase.from('profiles').select(select).ilike('username', pattern).limit(limit),
    supabase.from('profiles').select(select).ilike('display_name', pattern).limit(limit),
  ])

  if (byUsername.error) console.error('Profile search (username) failed:', byUsername.error)
  if (byDisplay.error) console.error('Profile search (display_name) failed:', byDisplay.error)

  const map = new Map<string, ProfileSearchHit>()
  for (const row of [...(byUsername.data || []), ...(byDisplay.data || [])]) {
    if (!row.username || map.has(row.id)) continue
    map.set(row.id, {
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      avatarUrl: row.avatar_url || null,
      isArtist: !!row.is_artist,
      artistStatus: (row.artist_status as ProfileSearchHit['artistStatus']) ?? null,
    })
  }

  return Array.from(map.values()).slice(0, limit)
}

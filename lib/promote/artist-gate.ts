import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivePromoteArtist = {
  id: string
  isArtist: true
  artistStatus: 'active'
}

/** Stricter than badge display: only active standing may connect accounts and publish. */
export async function requireActivePromoteArtist(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActivePromoteArtist | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, is_artist, artist_status')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.is_artist || data.artist_status !== 'active') {
    return null
  }

  return { id: data.id, isArtist: true, artistStatus: 'active' }
}

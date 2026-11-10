import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { favoriteSongsTablesReady } from '@/lib/favorites/table-ready'

export type ProfileFavoriteSong = {
  id: string
  title: string
  artistName: string
  artworkUrl: string | null
  position: number
  onMargo: boolean
}

export async function loadProfileFavoriteSongs(profileId: string): Promise<ProfileFavoriteSong[]> {
  if (!(await favoriteSongsTablesReady())) return []
  const admin = getSupabaseAdmin()
  const { data: links, error } = await admin
    .from('profile_favorite_songs')
    .select('position, catalog_song_id')
    .eq('profile_id', profileId)
    .order('position', { ascending: true })

  if (error || !links?.length) return []

  const songIds = links.map((r) => r.catalog_song_id as string)
  const { data: songs } = await admin
    .from('catalog_songs')
    .select('id, title, artist_name, artwork_url, margo_song_id, source')
    .in('id', songIds)

  const songMap = new Map((songs || []).map((s) => [s.id as string, s]))

  return links
    .map((row) => {
      const s = songMap.get(row.catalog_song_id as string)
      if (!s) return null
      return {
        position: row.position as number,
        id: s.id as string,
        title: s.title as string,
        artistName: s.artist_name as string,
        artworkUrl: (s.artwork_url as string | null) ?? null,
        onMargo: s.source === 'margo' || !!s.margo_song_id,
      }
    })
    .filter(Boolean) as ProfileFavoriteSong[]
}

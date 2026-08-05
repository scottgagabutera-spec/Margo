import type { SupabaseClient } from '@supabase/supabase-js'

export interface MargoSongHit {
  id: string
  title: string
  artist: string
  artwork: string
  audioUrl: string | null
}

function sanitizeIlike(query: string): string {
  // Strip ILIKE wildcards / quotes so user input can't broaden or break the filter.
  return (query || '').replace(/[%_"'\\]/g, '').trim()
}

/**
 * Client-side search of live Margo catalog songs.
 * Explicitly requires status = 'live' AND owner profiles.artist_status =
 * 'active' (mirrors the public-read songs RLS gate) — not RLS alone.
 */
export async function searchMargoSongs(
  supabase: SupabaseClient,
  query: string,
  limit = 8
): Promise<MargoSongHit[]> {
  const q = sanitizeIlike(query)
  if (q.length < 2) return []

  const pattern = `%${q}%`
  // Inner join on owner profile so we can filter artist_status in-query
  // (same predicate the songs RLS policy uses for public catalog reads).
  const select =
    'id, title, artist_display_name, artwork_url, audio_url, profiles!owner_profile_id!inner(artist_status)'

  const [byTitle, byArtist] = await Promise.all([
    supabase
      .from('songs')
      .select(select)
      .eq('status', 'live')
      .eq('profiles.artist_status', 'active')
      .ilike('title', pattern)
      .limit(limit),
    supabase
      .from('songs')
      .select(select)
      .eq('status', 'live')
      .eq('profiles.artist_status', 'active')
      .ilike('artist_display_name', pattern)
      .limit(limit),
  ])

  if (byTitle.error) console.error('Margo song search (title) failed:', byTitle.error)
  if (byArtist.error) console.error('Margo song search (artist) failed:', byArtist.error)

  const map = new Map<string, MargoSongHit>()
  for (const row of [...(byTitle.data || []), ...(byArtist.data || [])]) {
    if (map.has(row.id)) continue
    map.set(row.id, {
      id: row.id,
      title: row.title,
      artist: row.artist_display_name,
      artwork: row.artwork_url || '',
      audioUrl: row.audio_url || null,
    })
  }

  return Array.from(map.values()).slice(0, limit)
}

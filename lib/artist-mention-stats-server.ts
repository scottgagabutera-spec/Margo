import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type ArtistMentionStats = {
  ready: boolean
  artistFavoriteCount: number
  topSongs: { title: string; artistName: string; count: number }[]
  topAlbums: { title: string; artistName: string; count: number }[]
}

function columnMissing(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42703' || err.code === '42P01') return true
  const msg = err.message?.toLowerCase() ?? ''
  return msg.includes('does not exist')
}

export async function loadArtistMentionStats(profileId: string): Promise<ArtistMentionStats> {
  const empty: ArtistMentionStats = {
    ready: false,
    artistFavoriteCount: 0,
    topSongs: [],
    topAlbums: [],
  }
  const admin = getSupabaseAdmin()

  const { data: catalogArtist, error: caErr } = await admin
    .from('catalog_artists')
    .select('id, name, favorite_mention_count')
    .eq('margo_profile_id', profileId)
    .maybeSingle()

  if (caErr && columnMissing(caErr)) return empty

  const artistFavoriteCount = Math.max(0, (catalogArtist?.favorite_mention_count as number) ?? 0)

  const { data: ownedSongs } = await admin
    .from('songs')
    .select('id, title, artist_display_name')
    .eq('owner_profile_id', profileId)
    .eq('status', 'live')

  const ownedIds = (ownedSongs || []).map((s) => s.id as string)
  let topSongs: ArtistMentionStats['topSongs'] = []

  if (ownedIds.length > 0) {
    const { data: songRows, error: songErr } = await admin
      .from('catalog_songs')
      .select('title, artist_name, favorite_mention_count')
      .in('margo_song_id', ownedIds)
      .gt('favorite_mention_count', 0)
      .order('favorite_mention_count', { ascending: false })
      .limit(5)

    if (!songErr || !columnMissing(songErr)) {
      topSongs = (songRows || []).map((r) => ({
        title: r.title as string,
        artistName: r.artist_name as string,
        count: r.favorite_mention_count as number,
      }))
    }
  }

  const displayName =
    (ownedSongs?.[0]?.artist_display_name as string | undefined) ||
    (catalogArtist?.name as string | undefined) ||
    ''

  let topAlbums: ArtistMentionStats['topAlbums'] = []
  if (displayName.trim()) {
    const { data: albumRows, error: albumErr } = await admin
      .from('catalog_albums')
      .select('title, artist_name, favorite_mention_count')
      .ilike('artist_name', displayName.trim())
      .gt('favorite_mention_count', 0)
      .order('favorite_mention_count', { ascending: false })
      .limit(5)

    if (!albumErr || !columnMissing(albumErr)) {
      topAlbums = (albumRows || []).map((r) => ({
        title: r.title as string,
        artistName: r.artist_name as string,
        count: r.favorite_mention_count as number,
      }))
    }
  }

  const hasData = artistFavoriteCount > 0 || topSongs.length > 0 || topAlbums.length > 0
  if (!hasData) {
    return { ...empty, ready: !caErr }
  }

  return {
    ready: true,
    artistFavoriteCount,
    topSongs,
    topAlbums,
  }
}

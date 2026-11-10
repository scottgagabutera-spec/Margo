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
    .select('id, favorite_mention_count')
    .eq('margo_profile_id', profileId)
    .maybeSingle()

  if (caErr && columnMissing(caErr)) return empty

  const catalogArtistId = catalogArtist?.id as string | undefined
  const artistFavoriteCount = Math.max(0, (catalogArtist?.favorite_mention_count as number) ?? 0)

  let topSongs: ArtistMentionStats['topSongs'] = []
  let topAlbums: ArtistMentionStats['topAlbums'] = []

  if (catalogArtistId) {
    const { data: songRows, error: songErr } = await admin
      .from('catalog_songs')
      .select('title, artist_name, favorite_mention_count')
      .eq('catalog_artist_id', catalogArtistId)
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

    const { data: albumRows, error: albumErr } = await admin
      .from('catalog_albums')
      .select('title, artist_name, favorite_mention_count')
      .eq('catalog_artist_id', catalogArtistId)
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

  return {
    ready: !caErr,
    artistFavoriteCount,
    topSongs,
    topAlbums,
  }
}

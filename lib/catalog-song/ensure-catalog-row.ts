import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { favoriteSongsTablesReady } from '@/lib/favorites/table-ready'
import { resolveCatalogArtistIdForTrack } from '@/lib/catalog-song/resolve-catalog-artist-link'

export type SongSearchMaterialize = {
  id: string
  title: string
  artist: string
  artwork?: string | null
  source: 'margo' | 'genius' | 'apple'
  margoSongId?: string
}

export async function ensureCatalogSongFromSearchHit(
  hit: SongSearchMaterialize,
): Promise<{ id: string; title: string; artistName: string; artworkUrl: string | null } | null> {
  if (!(await favoriteSongsTablesReady())) return null
  const admin = getSupabaseAdmin()
  const source = hit.source
  const sourceId = source === 'margo' ? (hit.margoSongId?.trim() || hit.id) : hit.id
  const title = hit.title.trim()
  const artistName = hit.artist.trim()
  if (!sourceId || !title) return null

  const { data: found } = await admin
    .from('catalog_songs')
    .select('id, title, artist_name, artwork_url')
    .eq('source', source)
    .eq('source_id', sourceId)
    .maybeSingle()

  if (found?.id) {
    const margoSongId = source === 'margo' ? sourceId : null
    const linkId = await resolveCatalogArtistIdForTrack(artistName, margoSongId)
    if (linkId) {
      await admin
        .from('catalog_songs')
        .update({ catalog_artist_id: linkId })
        .eq('id', found.id as string)
        .is('catalog_artist_id', null)
    }
    return {
      id: found.id as string,
      title: found.title as string,
      artistName: found.artist_name as string,
      artworkUrl: (found.artwork_url as string | null) ?? null,
    }
  }

  const margoSongId = source === 'margo' ? sourceId : null
  const catalogArtistId = await resolveCatalogArtistIdForTrack(artistName, margoSongId)
  const { data: inserted, error } = await admin
    .from('catalog_songs')
    .insert({
      title,
      artist_name: artistName,
      source,
      source_id: sourceId,
      artwork_url: hit.artwork?.trim() || null,
      margo_song_id: margoSongId,
      catalog_artist_id: catalogArtistId,
    })
    .select('id, title, artist_name, artwork_url')
    .single()

  if (error?.code === '23505') {
    const { data: again } = await admin
      .from('catalog_songs')
      .select('id, title, artist_name, artwork_url')
      .eq('source', source)
      .eq('source_id', sourceId)
      .maybeSingle()
    if (again?.id) {
      if (catalogArtistId) {
        await admin
          .from('catalog_songs')
          .update({ catalog_artist_id: catalogArtistId })
          .eq('id', again.id as string)
          .is('catalog_artist_id', null)
      }
      return {
        id: again.id as string,
        title: again.title as string,
        artistName: again.artist_name as string,
        artworkUrl: (again.artwork_url as string | null) ?? null,
      }
    }
  }
  if (error || !inserted) {
    console.error('[ensureCatalogSongFromSearchHit]', error)
    return null
  }

  return {
    id: inserted.id as string,
    title: inserted.title as string,
    artistName: inserted.artist_name as string,
    artworkUrl: (inserted.artwork_url as string | null) ?? null,
  }
}

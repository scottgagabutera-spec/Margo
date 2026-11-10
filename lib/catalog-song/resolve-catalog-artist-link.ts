import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeArtistName } from '@/lib/catalog-artist/normalize'

/** Link a catalog song/album row to at most one catalog_artists row when unambiguous. */
export async function resolveCatalogArtistIdForTrack(
  artistName: string,
  margoSongId?: string | null,
): Promise<string | null> {
  const admin = getSupabaseAdmin()
  if (margoSongId) {
    const { data: song } = await admin
      .from('songs')
      .select('owner_profile_id')
      .eq('id', margoSongId)
      .maybeSingle()
    const ownerId = song?.owner_profile_id as string | undefined
    if (ownerId) {
      const { data: linked } = await admin
        .from('catalog_artists')
        .select('id')
        .eq('margo_profile_id', ownerId)
        .limit(2)
      if (linked?.length === 1) return linked[0].id as string
    }
  }

  const normalized = normalizeArtistName(artistName)
  if (!normalized) return null
  const { data: rows } = await admin
    .from('catalog_artists')
    .select('id')
    .eq('name_normalized', normalized)
    .limit(2)
  if (rows?.length === 1) return rows[0].id as string
  return null
}

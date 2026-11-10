import { getSupabaseAdmin } from '@/lib/supabase-admin'

type RpcItem = { catalog_id: string; position: number }

function rpcMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42883' || error.code === 'PGRST202') return true
  return (error.message || '').toLowerCase().includes('replace_profile_favorite')
}

export async function replaceProfileFavoriteArtists(
  profileId: string,
  items: { catalogArtistId: string; position: number }[],
): Promise<{ ok: true } | { ok: false; error: string; rpcMissing?: boolean }> {
  const admin = getSupabaseAdmin()
  const payload: RpcItem[] = items.map((item) => ({
    catalog_id: item.catalogArtistId,
    position: item.position,
  }))
  const { error } = await admin.rpc('replace_profile_favorite_artists', {
    p_profile_id: profileId,
    p_items: payload,
  })
  if (error) {
    if (rpcMissing(error)) return { ok: false, error: error.message, rpcMissing: true }
    console.error('[replace_profile_favorite_artists]', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function replaceProfileFavoriteSongs(
  profileId: string,
  items: { catalogSongId: string; position: number }[],
): Promise<{ ok: true } | { ok: false; error: string; rpcMissing?: boolean }> {
  const admin = getSupabaseAdmin()
  const payload: RpcItem[] = items.map((item) => ({
    catalog_id: item.catalogSongId,
    position: item.position,
  }))
  const { error } = await admin.rpc('replace_profile_favorite_songs', {
    p_profile_id: profileId,
    p_items: payload,
  })
  if (error) {
    if (rpcMissing(error)) return { ok: false, error: error.message, rpcMissing: true }
    console.error('[replace_profile_favorite_songs]', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { searchDeezerArtists } from '@/lib/catalog-artist/deezer-search'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'
import type { ProfileFavoriteArtist } from '@/components/profile-favorite-artists-row'

export async function loadProfileFavoriteArtists(profileId: string): Promise<ProfileFavoriteArtist[]> {
  const admin = getSupabaseAdmin()
  const { data: links, error } = await admin
    .from('profile_favorite_artists')
    .select('position, catalog_artist_id')
    .eq('profile_id', profileId)
    .order('position', { ascending: true })

  if (error || !links?.length) {
    if (error) console.error('[load-favorite-artists]', error)
    return []
  }

  const artistIds = links.map((r) => r.catalog_artist_id as string)
  const { data: artists } = await admin
    .from('catalog_artists')
    .select('id, name, artwork_r2_key, margo_profile_id, source, source_id')
    .in('id', artistIds)

  const artistMap = new Map((artists || []).map((a) => [a.id as string, a]))
  const profileIds = [...new Set((artists || []).map((a) => a.margo_profile_id).filter(Boolean))] as string[]
  const profileUsernames = new Map<string, { username: string; is_admin: boolean; avatarUrl: string | null }>()
  if (profileIds.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, username, is_admin, avatar_url, is_artist')
      .in('id', profileIds)
    for (const p of profs || []) {
      if (!p.is_artist) continue
      profileUsernames.set(p.id as string, {
        username: p.username as string,
        is_admin: !!p.is_admin,
        avatarUrl: ((p.avatar_url as string | null)?.trim() || null),
      })
    }
  }

  const deezerFallbackById = new Map<string, string | null>()
  const deezerRows = (artists || []).filter((a) => (a.source as string) === 'deezer')
  await Promise.all(
    deezerRows.map(async (a) => {
      try {
        const hits = await searchDeezerArtists(a.name as string, 4)
        const hit =
          hits.find((h) => h.sourceId === (a.source_id as string)) ||
          hits[0]
        deezerFallbackById.set(a.id as string, hit?.pictureUrl ?? null)
      } catch {
        deezerFallbackById.set(a.id as string, null)
      }
    }),
  )

  return links
    .map((row) => {
      const ca = artistMap.get(row.catalog_artist_id as string)
      if (!ca) return null
      const prof = ca.margo_profile_id ? profileUsernames.get(ca.margo_profile_id as string) : undefined
      const username = prof && !prof.is_admin ? prof.username : null
      const r2Art = ca.artwork_r2_key ? publicCatalogMediaUrl(ca.artwork_r2_key as string) : null
      const deezerPreview =
        deezerFallbackById.get(ca.id as string) ??
        (ca.source === 'deezer' ? deezerFallbackById.get(ca.id as string) : null)
      const margoAvatar = username ? prof?.avatarUrl ?? null : null
      return {
        position: row.position as number,
        id: ca.id as string,
        name: ca.name as string,
        artworkUrl: r2Art ?? margoAvatar ?? deezerPreview,
        fallbackArtworkUrl: r2Art ? deezerPreview ?? null : deezerPreview,
        onMargo: !!username,
        margoUsername: username,
      }
    })
    .filter(Boolean) as ProfileFavoriteArtist[]
}

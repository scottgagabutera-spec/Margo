import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeArtistName } from '@/lib/catalog-artist/normalize'

export async function findMargoArtistProfileId(artistName: string): Promise<{
  profileId: string
  username: string
} | null> {
  const normalized = normalizeArtistName(artistName)
  if (!normalized) return null
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('id, username, display_name, is_artist, is_admin')
      .eq('is_artist', true)
      .neq('is_admin', true)
    if (error || !data?.length) return null
    const hit = data.find((row) => {
      const dn = normalizeArtistName(row.display_name || '')
      const un = normalizeArtistName(row.username || '')
      return dn === normalized || un === normalized
    })
    if (!hit) return null
    return { profileId: hit.id, username: hit.username }
  } catch {
    return null
  }
}

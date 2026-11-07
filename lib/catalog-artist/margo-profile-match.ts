import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { normalizeArtistName } from '@/lib/catalog-artist/normalize'

export type MargoArtistProfileRow = {
  id: string
  username: string
  display_name: string | null
}

/**
 * Exact normalized match on is_artist profiles (non-admin).
 * Zero or multiple matches → no On Margo link.
 */
export function pickUniqueMargoArtistMatch(
  artistName: string,
  rows: MargoArtistProfileRow[],
): { profileId: string; username: string } | null {
  const normalized = normalizeArtistName(artistName)
  if (!normalized) return null
  const matches = rows.filter((row) => {
    const dn = normalizeArtistName(row.display_name || '')
    const un = normalizeArtistName(row.username || '')
    return dn === normalized || un === normalized
  })
  if (matches.length !== 1) return null
  const hit = matches[0]
  return { profileId: hit.id, username: hit.username }
}

export async function findMargoArtistProfileId(artistName: string): Promise<{
  profileId: string
  username: string
} | null> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('id, username, display_name, is_artist, is_admin')
      .eq('is_artist', true)
      .neq('is_admin', true)
    if (error || !data?.length) return null
    const rows: MargoArtistProfileRow[] = data.map((row) => ({
      id: row.id as string,
      username: row.username as string,
      display_name: (row.display_name as string | null) ?? null,
    }))
    return pickUniqueMargoArtistMatch(artistName, rows)
  } catch {
    return null
  }
}

export async function loadMargoArtistProfileForCatalog(profileId: string): Promise<{
  username: string
  avatarUrl: string | null
} | null> {
  try {
    const admin = getSupabaseAdmin()
    const { data: prof } = await admin
      .from('profiles')
      .select('username, is_admin, is_artist, avatar_url')
      .eq('id', profileId)
      .maybeSingle()
    if (!prof || prof.is_admin || !prof.is_artist) return null
    const avatar = (prof.avatar_url as string | null)?.trim() || null
    return {
      username: prof.username as string,
      avatarUrl: avatar,
    }
  } catch {
    return null
  }
}

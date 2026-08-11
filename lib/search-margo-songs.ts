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
 * Normalize title/artist for catalog dedupe + rematch:
 * lowercase, strip feat/ft parentheticals and trailing features, punctuation.
 */
export function normalizeSongToken(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(feat\.?|ft\.?|featuring)\b.*$/i, ' ')
    .replace(/[.,!?;:"'\u2018\u2019\u201c\u201d/\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Dedupe key for merging catalog + Genius/Apple result lists. */
export function songMatchKey(title: string, artist: string): string {
  return `${normalizeSongToken(title)}|${normalizeSongToken(artist)}`
}

const CATALOG_SELECT =
  'id, title, artist_display_name, artwork_url, audio_url, profiles!owner_profile_id!inner(artist_status)'

function rowToHit(row: {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  audio_url: string | null
}): MargoSongHit {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist_display_name,
    artwork: row.artwork_url || '',
    audioUrl: row.audio_url || null,
  }
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

  const [byTitle, byArtist] = await Promise.all([
    supabase
      .from('songs')
      .select(CATALOG_SELECT)
      .eq('status', 'live')
      .eq('profiles.artist_status', 'active')
      .ilike('title', pattern)
      .limit(limit),
    supabase
      .from('songs')
      .select(CATALOG_SELECT)
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
    map.set(row.id, rowToHit(row))
  }

  return Array.from(map.values()).slice(0, limit)
}

/**
 * Soft rematch Genius/Apple pick → live catalog song.
 * Prefer normalized title+artist equality; require at least title match with
 * overlapping artist signal so we don't steal wrong tracks.
 */
export async function matchLiveCatalogSong(
  supabase: SupabaseClient,
  title: string,
  artist: string,
): Promise<MargoSongHit | null> {
  const titleCore = normalizeSongToken(title)
  const artistCore = normalizeSongToken(artist)
  if (titleCore.length < 2) return null

  const titleQuery = sanitizeIlike(titleCore.split(' ').slice(0, 6).join(' '))
  if (titleQuery.length < 2) return null

  const { data, error } = await supabase
    .from('songs')
    .select(CATALOG_SELECT)
    .eq('status', 'live')
    .eq('profiles.artist_status', 'active')
    .ilike('title', `%${titleQuery}%`)
    .limit(24)

  if (error) {
    console.error('matchLiveCatalogSong failed:', error)
    return null
  }
  if (!data?.length) return null

  let best: MargoSongHit | null = null
  let bestScore = 0
  for (const row of data) {
    const nt = normalizeSongToken(row.title)
    const na = normalizeSongToken(row.artist_display_name)
    let score = 0
    const artistOverlap =
      !artistCore
      || na === artistCore
      || (artistCore.length >= 2 && (na.includes(artistCore) || artistCore.includes(na)))

    if (nt === titleCore && na === artistCore) score = 100
    else if (nt === titleCore && artistOverlap) score = 80
    else if ((nt.includes(titleCore) || titleCore.includes(nt)) && artistOverlap) score = 55
    else if (nt === titleCore) score = 35

    if (score > bestScore) {
      bestScore = score
      best = rowToHit(row)
    }
  }

  // Require artist signal when we only have fuzzy title containment.
  return bestScore >= 55 ? best : null
}

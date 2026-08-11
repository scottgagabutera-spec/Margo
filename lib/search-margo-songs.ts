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

/** Collapse Margo / Trymargo aliases so Apple + catalog rows dedupe. */
export function canonicalArtistKey(artist: string): string {
  const a = normalizeSongToken(artist).replace(/\s+/g, '')
  if (!a) return ''
  if (a === 'margo' || a === 'trymargo') return 'trymargo'
  return normalizeSongToken(artist)
}

function artistsOverlap(a: string, b: string): boolean {
  const ca = canonicalArtistKey(a)
  const cb = canonicalArtistKey(b)
  if (!ca && !cb) return true
  if (!ca || !cb) return false
  if (ca === cb) return true
  return ca.includes(cb) || cb.includes(ca)
}

/** Dedupe key for merging catalog + Genius/Apple result lists. */
export function songMatchKey(title: string, artist: string): string {
  return `${normalizeSongToken(title)}|${canonicalArtistKey(artist)}`
}

const CATALOG_SELECT =
  'id, title, artist_display_name, artwork_url, audio_url, profiles!owner_profile_id!inner(artist_status, username, display_name)'

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

function mergeHits(
  map: Map<string, MargoSongHit>,
  rows: any[] | null | undefined,
) {
  for (const row of rows || []) {
    if (map.has(row.id)) continue
    map.set(row.id, rowToHit(row))
  }
}

/** Drop last 1–2 tokens as a possible artist suffix → title-only ILIKE. */
function titlePrefixCandidates(q: string): string[] {
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length < 3) return []
  const out: string[] = []
  for (const drop of [1, 2]) {
    const titlePart = tokens.slice(0, -drop).join(' ')
    if (titlePart.length >= 2) out.push(titlePart)
  }
  return out
}

/**
 * Client-side search of live Margo catalog songs.
 * Explicitly requires status = 'live' AND owner profiles.artist_status =
 * 'active' (mirrors the public-read songs RLS gate) — not RLS alone.
 *
 * Also matches owner username/display_name, and title prefixes when the
 * query includes a trailing artist token (e.g. "Leave the lights on Trymargo"
 * still finds a song titled "Leave the lights on" credited as "Margo").
 */
export async function searchMargoSongs(
  supabase: SupabaseClient,
  query: string,
  limit = 8
): Promise<MargoSongHit[]> {
  const q = sanitizeIlike(query)
  if (q.length < 2) return []

  const pattern = `%${q}%`
  const titlePrefixes = titlePrefixCandidates(q)

  const liveActive = () =>
    supabase
      .from('songs')
      .select(CATALOG_SELECT)
      .eq('status', 'live')
      .eq('profiles.artist_status', 'active')

  const requests = [
    liveActive().ilike('title', pattern).limit(limit),
    liveActive().ilike('artist_display_name', pattern).limit(limit),
    liveActive()
      .or(`username.ilike."${pattern}",display_name.ilike."${pattern}"`, { foreignTable: 'profiles' })
      .limit(limit),
    ...titlePrefixes.map((titlePart) =>
      liveActive().ilike('title', `%${sanitizeIlike(titlePart)}%`).limit(limit),
    ),
  ]

  const results = await Promise.all(requests)
  for (const r of results) {
    if (r.error) console.error('Margo song search failed:', r.error)
  }

  const map = new Map<string, MargoSongHit>()
  for (const r of results) mergeHits(map, r.data)

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
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const ownerName = profile?.username || profile?.display_name || ''
    let score = 0
    const artistOk =
      !artistCore
      || artistsOverlap(artistCore, na)
      || artistsOverlap(artistCore, ownerName)

    if (nt === titleCore && artistsOverlap(artistCore, na)) score = 100
    else if (nt === titleCore && artistOk) score = 80
    else if ((nt.includes(titleCore) || titleCore.includes(nt)) && artistOk) score = 55
    else if (nt === titleCore) score = 35

    if (score > bestScore) {
      bestScore = score
      best = rowToHit(row)
    }
  }

  // Require artist signal when we only have fuzzy title containment.
  return bestScore >= 55 ? best : null
}

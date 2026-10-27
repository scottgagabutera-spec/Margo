import { parseAppleTrackCredit } from '@/lib/apple-track-credit'
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/fetch-with-timeout'

export const GENIUS_EXTERNAL_TIMEOUT_MS = 1500

export type ExternalSongHit = {
  id: string | number | null
  song: string
  artist: string
  artwork: string | null
  source: string
  geniusUrl: string | null
  trackViewUrl: string | null
}

function normalize(str: string) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function dedupeExternalSongHits(results: ExternalSongHit[]): ExternalSongHit[] {
  const seen = new Set<string>()
  return results.filter((r) => {
    const key = normalize(r.song) + '|' + normalize(r.artist)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Payload fields the stage/compose dropdown consumes. */
export function trimExternalSongHit(r: ExternalSongHit) {
  return {
    id: r.id,
    song: r.song,
    artist: r.artist,
    artwork: r.artwork,
    source: r.source,
    geniusUrl: r.geniusUrl,
    trackViewUrl: r.trackViewUrl,
  }
}

async function searchGenius(query: string, apiKey: string): Promise<ExternalSongHit[]> {
  const q = encodeURIComponent(query.trim())
  const r = await fetchWithTimeout(
    `https://api.genius.com/search?q=${q}&per_page=5`,
    { headers: { Authorization: `Bearer ${apiKey}` }, timeoutMs: GENIUS_EXTERNAL_TIMEOUT_MS },
  )
  if (!r.ok) return []
  const data = await r.json()
  const hits = data.response?.hits || []
  return hits.slice(0, 2).map((h: { result: Record<string, unknown> }) => {
    const s = h.result
    return {
      song: String(s.title || ''),
      artist: String((s.primary_artist as { name?: string })?.name || 'Unknown Artist'),
      artwork: (s.song_art_image_thumbnail_url as string) || (s.header_image_thumbnail_url as string) || null,
      geniusUrl: (s.url as string) || null,
      trackViewUrl: null,
      id: (s.id as number) ?? null,
      source: 'genius',
    }
  })
}

async function searchItunes(query: string): Promise<ExternalSongHit[]> {
  const q = encodeURIComponent(query.trim())
  const r = await fetchWithTimeout(
    `https://itunes.apple.com/search?term=${q}&entity=song&limit=8&version=2`,
    { timeoutMs: GENIUS_EXTERNAL_TIMEOUT_MS },
  )
  if (!r.ok) return []
  const data = await r.json()
  const tracks = (data.results || []).filter((t: { wrapperType?: string }) => t.wrapperType === 'track')
  return tracks.slice(0, 3).map((t: Record<string, unknown>) => {
    const credit = parseAppleTrackCredit(String(t.trackName || ''), String(t.artistName || 'Unknown Artist'))
    return {
      song: credit.title,
      artist: credit.artist,
      artwork: (t.artworkUrl100 as string) || null,
      geniusUrl: null,
      trackViewUrl: (t.trackViewUrl as string) || null,
      id: null,
      source: 'apple',
    }
  })
}

export async function fetchExternalSongHits(query: string, geniusKey: string | undefined): Promise<ExternalSongHit[]> {
  const [geniusResult, itunesResult] = await Promise.allSettled([
    geniusKey ? searchGenius(query, geniusKey) : Promise.resolve([]),
    searchItunes(query),
  ])
  const geniusResults = geniusResult.status === 'fulfilled' ? geniusResult.value : []
  const itunesResults = itunesResult.status === 'fulfilled' ? itunesResult.value : []
  if (geniusResult.status === 'rejected' && !(geniusResult.reason instanceof FetchTimeoutError)) {
    /* keep partial itunes */
  }
  return dedupeExternalSongHits([...geniusResults, ...itunesResults]).slice(0, 5)
}

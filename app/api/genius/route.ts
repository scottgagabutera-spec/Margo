import { NextRequest, NextResponse } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import { getRequestClientIp, ipRateLimitBucket } from '@/lib/api-request-ip'
import { parseAppleTrackCredit } from '@/lib/apple-track-credit'

const MAX_QUERY_LEN = 200
const RATE_LIMIT_PER_HOUR = 120
const MAX_CACHE_ENTRIES = 500

/** LRU-ish cache: Map preserves insertion order. */
const searchCache = new Map<string, unknown>()

function normalize(str: string) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function cacheGet(key: string): unknown | undefined {
  const hit = searchCache.get(key)
  if (hit === undefined) return undefined
  searchCache.delete(key)
  searchCache.set(key, hit)
  return hit
}

function cacheSet(key: string, value: unknown): void {
  if (searchCache.has(key)) searchCache.delete(key)
  searchCache.set(key, value)
  while (searchCache.size > MAX_CACHE_ENTRIES) {
    const oldest = searchCache.keys().next().value
    if (oldest === undefined) break
    searchCache.delete(oldest)
  }
}

function dedupe(results: SearchResult[]) {
  const seen = new Set()
  return results.filter(r => {
    const key = normalize(r.song) + '|' + normalize(r.artist)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface SearchResult {
  song: string
  artist: string
  artwork: string | null
  artworkFull: string | null
  geniusUrl: string | null
  trackViewUrl: string | null
  id: number | null
  source: string
}

async function searchGenius(query: string, apiKey: string): Promise<SearchResult[]> {
  const q = encodeURIComponent(query.trim())
  const r = await fetch(
    `https://api.genius.com/search?q=${q}&per_page=5`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )
  if (!r.ok) return []
  const data = await r.json()
  const hits = data.response?.hits || []
  return hits.slice(0, 2).map((h: any) => {
    const s = h.result
    return {
      song: s.title,
      artist: s.primary_artist?.name || 'Unknown Artist',
      artwork: s.song_art_image_thumbnail_url || s.header_image_thumbnail_url || null,
      artworkFull: s.song_art_image_url || s.header_image_url || null,
      geniusUrl: s.url || null,
      trackViewUrl: null,
      id: s.id,
      source: 'genius',
    }
  })
}

async function searchItunes(query: string): Promise<SearchResult[]> {
  const q = encodeURIComponent(query.trim())
  const r = await fetch(
    `https://itunes.apple.com/search?term=${q}&entity=song&limit=8&version=2`
  )
  if (!r.ok) return []
  const data = await r.json()
  const tracks = (data.results || []).filter((t: any) => t.wrapperType === 'track')
  return tracks.slice(0, 3).map((t: any) => {
    const credit = parseAppleTrackCredit(t.trackName || '', t.artistName || 'Unknown Artist')
    return {
      song: credit.title,
      artist: credit.artist,
      artwork: t.artworkUrl100 || null,
      artworkFull: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : null,
      geniusUrl: null,
      trackViewUrl: t.trackViewUrl || null,
      id: null,
      source: 'apple',
    }
  })
}

export async function GET(request: NextRequest) {
  const bucket = ipRateLimitBucket(getRequestClientIp(request))
  const limited = await consumeHourlyApiRateLimit({
    route: 'genius',
    bucket,
    limit: RATE_LIMIT_PER_HOUR,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    )
  }

  const { searchParams } = new URL(request.url)
  const lyric = searchParams.get('lyric')?.slice(0, MAX_QUERY_LEN) ?? null
  const song = searchParams.get('song')?.slice(0, MAX_QUERY_LEN) ?? null
  const id = searchParams.get('id')

  if (id) {
    try {
      const r = await fetch(
        `https://api.genius.com/songs/${id}?text_format=plain`,
        { headers: { Authorization: `Bearer ${process.env.GENIUS_API_KEY}` } }
      )
      if (!r.ok) return NextResponse.json({ error: 'Song not found' }, { status: 404 })
      const data = await r.json()
      const s = data.response?.song
      if (!s) return NextResponse.json({ error: 'Song not found' }, { status: 404 })
      return NextResponse.json({
        song: s.title,
        artist: s.primary_artist?.name || null,
        album: s.album?.name || null,
        releaseDate: s.release_date_for_display || null,
        featuredArtists: s.featured_artists?.map((a: any) => a.name) || [],
        producers: s.producer_artists?.map((a: any) => a.name) || [],
        writers: s.writer_artists?.map((a: any) => a.name) || [],
        artwork: s.song_art_image_thumbnail_url || null,
        artworkFull: s.song_art_image_url || null,
        geniusUrl: s.url || null,
      })
    } catch {
      return NextResponse.json({ error: 'Song detail lookup failed' }, { status: 500 })
    }
  }

  const query = lyric || song
  if (!query) return NextResponse.json({ error: 'lyric or song query required' }, { status: 400 })

  const cacheKey = normalize(query)
  const cached = cacheGet(cacheKey)
  if (cached) {
    return NextResponse.json({ results: cached, source: 'cache' })
  }

  const geniusKey = process.env.GENIUS_API_KEY

  try {
    const [geniusResult, itunesResult] = await Promise.allSettled([
      geniusKey ? searchGenius(query, geniusKey) : Promise.resolve([] as SearchResult[]),
      searchItunes(query),
    ])
    const geniusResults = geniusResult.status === 'fulfilled' ? geniusResult.value : []
    const itunesResults = itunesResult.status === 'fulfilled' ? itunesResult.value : []
    const merged = dedupe([...geniusResults, ...itunesResults])
    const results = merged.slice(0, 5)
    if (!results.length) {
      return NextResponse.json({
        error: geniusKey ? 'No results found' : 'No results found (Genius not configured on this environment)',
      }, { status: 404 })
    }
    cacheSet(cacheKey, results)
    return NextResponse.json({ results, geniusConfigured: !!geniusKey })
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Search failed', detail }, { status: 500 })
  }
}

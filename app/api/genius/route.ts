import { NextRequest, NextResponse } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import { getRequestClientIp, ipRateLimitBucket } from '@/lib/api-request-ip'
import {
  fetchExternalSongHits,
  trimExternalSongHit,
} from '@/lib/genius-external-search'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

const MAX_QUERY_LEN = 200
const RATE_LIMIT_PER_HOUR = 120
const MAX_CACHE_ENTRIES = 500
const SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

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
      const r = await fetchWithTimeout(
        `https://api.genius.com/songs/${id}?text_format=plain`,
        { headers: { Authorization: `Bearer ${process.env.GENIUS_API_KEY}` }, timeoutMs: 1500 },
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
        featuredArtists: s.featured_artists?.map((a: { name: string }) => a.name) || [],
        producers: s.producer_artists?.map((a: { name: string }) => a.name) || [],
        writers: s.writer_artists?.map((a: { name: string }) => a.name) || [],
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
    return NextResponse.json({ results: cached, source: 'cache' }, { headers: SEARCH_CACHE_HEADERS })
  }

  const geniusKey = process.env.GENIUS_API_KEY

  try {
    const merged = await fetchExternalSongHits(query, geniusKey)
    const results = merged.map(trimExternalSongHit)
    if (!results.length) {
      return NextResponse.json({
        error: geniusKey ? 'No results found' : 'No results found (Genius not configured on this environment)',
      }, { status: 404 })
    }
    cacheSet(cacheKey, results)
    return NextResponse.json(
      { results, geniusConfigured: !!geniusKey },
      { headers: SEARCH_CACHE_HEADERS },
    )
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Search failed', detail }, { status: 500 })
  }
}

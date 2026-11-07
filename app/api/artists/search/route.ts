import { NextRequest, NextResponse } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import { getRequestClientIp, ipRateLimitBucket } from '@/lib/api-request-ip'
import { searchDeezerArtists } from '@/lib/catalog-artist/deezer-search'
import { ensureCatalogArtistFromDeezer } from '@/lib/catalog-artist/ensure-catalog-row'

const MAX_QUERY_LEN = 120
const RATE_LIMIT_PER_HOUR = 90
const MAX_CACHE = 400
const SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}

const searchCache = new Map<string, { artists: unknown[]; at: number }>()

function cacheGet(key: string) {
  const hit = searchCache.get(key)
  if (!hit) return undefined
  searchCache.delete(key)
  searchCache.set(key, hit)
  return hit.artists
}

function cacheSet(key: string, artists: unknown[]) {
  searchCache.delete(key)
  searchCache.set(key, { artists, at: Date.now() })
  while (searchCache.size > MAX_CACHE) {
    const oldest = searchCache.keys().next().value
    if (oldest === undefined) break
    searchCache.delete(oldest)
  }
}

export async function GET(request: NextRequest) {
  const t0 = Date.now()
  const bucket = ipRateLimitBucket(getRequestClientIp(request))
  const limited = await consumeHourlyApiRateLimit({
    route: 'artists_search',
    bucket,
    limit: RATE_LIMIT_PER_HOUR,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many searches. Try again later.' }, { status: 429 })
  }

  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LEN)
  if (q.length < 2) {
    return NextResponse.json({ artists: [] }, { headers: SEARCH_CACHE_HEADERS })
  }

  const cacheKey = q.toLowerCase()
  const cached = cacheGet(cacheKey)
  if (cached) {
    const dur = Date.now() - t0
    return NextResponse.json(
      { artists: cached },
      {
        headers: {
          ...SEARCH_CACHE_HEADERS,
          'Server-Timing': `cache;dur=${dur}`,
        },
      },
    )
  }

  try {
    const tDeezer = Date.now()
    const hits = await searchDeezerArtists(q, 8)
    const deezerMs = Date.now() - tDeezer
    const artists = []
    const tEnsure = Date.now()
    for (const hit of hits.slice(0, 8)) {
      try {
        artists.push(await ensureCatalogArtistFromDeezer(hit, { materializeArtwork: false }))
      } catch (e) {
        console.warn('[artists/search] ensure row failed', hit.sourceId, e)
      }
    }
    const ensureMs = Date.now() - tEnsure
    cacheSet(cacheKey, artists)
    const total = Date.now() - t0
    return NextResponse.json(
      { artists },
      {
        headers: {
          ...SEARCH_CACHE_HEADERS,
          'Server-Timing': `deezer;dur=${deezerMs}, ensure;dur=${ensureMs}, total;dur=${total}`,
        },
      },
    )
  } catch (e) {
    console.error('[artists/search]', e)
    return NextResponse.json({ artists: [] }, { headers: SEARCH_CACHE_HEADERS })
  }
}

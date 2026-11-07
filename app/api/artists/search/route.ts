import { NextRequest, NextResponse } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import { getRequestClientIp, ipRateLimitBucket } from '@/lib/api-request-ip'
import { searchDeezerArtists } from '@/lib/catalog-artist/deezer-search'
import { ensureCatalogArtistFromDeezer } from '@/lib/catalog-artist/ensure-catalog-row'

const MAX_QUERY_LEN = 120
const RATE_LIMIT_PER_HOUR = 90

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ artists: [] })
  }

  try {
    const hits = await searchDeezerArtists(q, 10)
    const artists = []
    for (const hit of hits.slice(0, 8)) {
      try {
        artists.push(await ensureCatalogArtistFromDeezer(hit))
      } catch (e) {
        console.warn('[artists/search] ensure row failed', hit.sourceId, e)
      }
    }
    return NextResponse.json(
      { artists },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (e) {
    console.error('[artists/search]', e)
    return NextResponse.json({ artists: [] })
  }
}

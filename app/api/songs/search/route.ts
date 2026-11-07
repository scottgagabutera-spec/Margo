import { NextRequest, NextResponse } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import { getRequestClientIp, ipRateLimitBucket } from '@/lib/api-request-ip'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import {
  fetchExternalSongHits,
  trimExternalSongHit,
} from '@/lib/genius-external-search'
import { searchMargoSongs, songMatchKey } from '@/lib/search-margo-songs'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const MAX_QUERY_LEN = 120
const MAX_LIMIT = 12
const RATE_LIMIT_PER_HOUR = 120
const SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
}

type SongSearchHit = {
  id: string
  title: string
  artist: string
  artwork: string
  source: 'margo' | 'genius' | 'apple'
  margoSongId?: string
  audioUrl?: string | null
  externalListenUrl?: string | null
}

export async function GET(request: NextRequest) {
  const bucket = ipRateLimitBucket(getRequestClientIp(request))
  const limited = await consumeHourlyApiRateLimit({
    route: 'songs_search',
    bucket,
    limit: RATE_LIMIT_PER_HOUR,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests', hits: [] as SongSearchHit[] },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    )
  }

  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, MAX_QUERY_LEN)
  const limitRaw = Number.parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT) : 10

  if (q.length < 2) {
    return NextResponse.json({ hits: [] as SongSearchHit[] }, { headers: SEARCH_CACHE_HEADERS })
  }

  try {
    const admin = getSupabaseAdmin()
    const geniusKey = process.env.GENIUS_API_KEY

    const [margoHits, external] = await Promise.all([
      searchMargoSongs(admin, q, limit),
      fetchExternalSongHits(q, geniusKey).catch(() => []),
    ])

    const margoMapped: SongSearchHit[] = margoHits.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      artwork: compactArtworkUrl(song.artwork, 100) || song.artwork || '',
      source: 'margo',
      margoSongId: song.id,
      audioUrl: song.audioUrl,
    }))

    const margoKeys = new Set(margoMapped.map((r) => songMatchKey(r.title, r.artist)))

    const externalMapped: SongSearchHit[] = external
      .map((r) => {
        const t = trimExternalSongHit(r)
        const rawSource = String(t.source || '').toLowerCase()
        const source: SongSearchHit['source'] =
          rawSource === 'itunes' || rawSource === 'apple' ? 'apple' : 'genius'
        const trackViewUrl = typeof t.trackViewUrl === 'string' ? t.trackViewUrl : null
        const geniusUrl = typeof t.geniusUrl === 'string' ? t.geniusUrl : null
        return {
          id: String(t.id ?? `${t.song}-${t.artist}`),
          title: String(t.song ?? ''),
          artist: String(t.artist ?? ''),
          artwork: compactArtworkUrl(t.artwork || '', 100) || '',
          source,
          externalListenUrl: trackViewUrl || geniusUrl || null,
        }
      })
      .filter((r) => r.title && !margoKeys.has(songMatchKey(r.title, r.artist)))

    const hits = [...margoMapped, ...externalMapped].slice(0, limit)
    return NextResponse.json({ hits }, { headers: SEARCH_CACHE_HEADERS })
  } catch (e) {
    console.error('[songs/search]', e)
    return NextResponse.json(
      { error: 'Search failed', hits: [] as SongSearchHit[] },
      { status: 500 },
    )
  }
}

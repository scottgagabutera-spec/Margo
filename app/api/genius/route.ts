import { NextRequest, NextResponse } from 'next/server'

const searchCache: Record<string, unknown> = {}

function normalize(str: string) {
  return (str || '').toLowerCase().trim().replace(/\s+/g, ' ')
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
  return tracks.slice(0, 3).map((t: any) => ({
    song: t.trackName,
    artist: t.artistName || 'Unknown Artist',
    artwork: t.artworkUrl100 || null,
    artworkFull: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : null,
    geniusUrl: null,
    trackViewUrl: t.trackViewUrl || null,
    id: null,
    source: 'apple',
  }))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lyric = searchParams.get('lyric')
  const song = searchParams.get('song')
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
  if (!process.env.GENIUS_API_KEY) return NextResponse.json({ error: 'Genius not configured' }, { status: 503 })

  const cacheKey = normalize(query)
  if (searchCache[cacheKey]) {
    return NextResponse.json({ results: searchCache[cacheKey], source: 'cache' })
  }

  try {
    const [geniusResult, itunesResult] = await Promise.allSettled([
      searchGenius(query, process.env.GENIUS_API_KEY!),
      searchItunes(query),
    ])
    const geniusResults = geniusResult.status === 'fulfilled' ? geniusResult.value : []
    const itunesResults = itunesResult.status === 'fulfilled' ? itunesResult.value : []
    const merged = dedupe([...geniusResults, ...itunesResults])
    const results = merged.slice(0, 5)
    if (!results.length) return NextResponse.json({ error: 'No results found' }, { status: 404 })
    searchCache[cacheKey] = results
    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: 'Search failed', detail: err.message }, { status: 500 })
  }
}

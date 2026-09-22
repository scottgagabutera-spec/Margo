import { NextRequest, NextResponse } from 'next/server'
import { searchPostgresFallback } from '@/lib/meilisearch/postgres-search'
import type { MargoSearchResponse } from '@/lib/meilisearch/types'
import { getSearchScope } from '@/lib/search-scope'
import { createClient } from '@/lib/supabase/server'

const EMPTY_RESULTS: MargoSearchResponse['results'] = {
  users: [],
  lyrics: [],
  artists: [],
  catalogLines: [],
  songs: [],
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim()
  const scope = getSearchScope(request.nextUrl.searchParams.get('scope'))
  const playlistId = request.nextUrl.searchParams.get('playlist')
  const empty = {
    query: q,
    results: { ...EMPTY_RESULTS },
    processingTimeMs: 0,
  } satisfies MargoSearchResponse

  if (q.length < 2) {
    return NextResponse.json(empty)
  }

  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const fallback = await searchPostgresFallback(supabase, q, {
      types: scope.types,
      limitPerType: 8,
      playlistId: scope.id === 'playlist' ? playlistId : null,
      restrictToPlaylist: scope.id === 'playlist',
      libraryUserId: scope.id === 'library' ? auth.user?.id ?? null : null,
      restrictToLibrary: scope.id === 'library',
      lyricsRequireSong: !!scope.lyricsRequireSong,
    })
    return NextResponse.json({
      query: q,
      results: fallback.results,
      processingTimeMs: fallback.processingTimeMs,
    } satisfies MargoSearchResponse)
  } catch (e) {
    console.error('[search]', e)
    const message = e instanceof Error ? e.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

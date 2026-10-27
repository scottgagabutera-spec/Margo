import { NextRequest, NextResponse } from 'next/server'
import { searchPostgresFallback } from '@/lib/meilisearch/postgres-search'
import type { MargoSearchResponse } from '@/lib/meilisearch/types'
import { postgresSearchOptionsForScope } from '@/lib/search-api-scope'
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
    const fallback = await searchPostgresFallback(
      supabase,
      q,
      postgresSearchOptionsForScope(scope, {
        playlistId,
        libraryUserId: auth.user?.id ?? null,
      }),
    )
    return NextResponse.json(
      {
        query: q,
        results: fallback.results,
        processingTimeMs: fallback.processingTimeMs,
      } satisfies MargoSearchResponse,
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
    )
  } catch (e) {
    console.error('[search]', e)
    const message = e instanceof Error ? e.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

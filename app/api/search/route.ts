import { NextRequest, NextResponse } from 'next/server'
import { isMeilisearchSearchReady, searchMargoIndex } from '@/lib/meilisearch/client'
import { categorizeHits } from '@/lib/meilisearch/documents'
import { searchPostgresFallback } from '@/lib/meilisearch/postgres-search'
import type { MargoSearchResponse } from '@/lib/meilisearch/types'
import { getSearchScope } from '@/lib/search-scope'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim()
  const scope = getSearchScope(request.nextUrl.searchParams.get('scope'))
  const empty = {
    query: q,
    results: { users: [], lyrics: [], artists: [], catalogLines: [] },
    processingTimeMs: 0,
  } satisfies MargoSearchResponse

  if (q.length < 2) {
    return NextResponse.json(empty)
  }

  try {
    if (isMeilisearchSearchReady()) {
      const { hits, processingTimeMs } = await searchMargoIndex(q, 8, scope.types)
      return NextResponse.json({
        query: q,
        results: categorizeHits(hits, 8),
        processingTimeMs,
      } satisfies MargoSearchResponse)
    }

    const supabase = await createClient()
    const fallback = await searchPostgresFallback(supabase, q, scope.types, 8)
    return NextResponse.json({
      query: q,
      results: fallback.results,
      processingTimeMs: fallback.processingTimeMs,
    } satisfies MargoSearchResponse)
  } catch (e) {
    console.error('[search]', e)
    try {
      const supabase = await createClient()
      const fallback = await searchPostgresFallback(supabase, q, scope.types, 8)
      return NextResponse.json({
        query: q,
        results: fallback.results,
        processingTimeMs: fallback.processingTimeMs,
      } satisfies MargoSearchResponse)
    } catch (fallbackError) {
      console.error('[search-fallback]', fallbackError)
      const message = e instanceof Error ? e.message : 'Search failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}

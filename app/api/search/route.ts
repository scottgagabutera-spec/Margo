import { NextRequest, NextResponse } from 'next/server'
import { searchMargoIndex } from '@/lib/meilisearch/client'
import { categorizeHits } from '@/lib/meilisearch/documents'
import type { MargoSearchResponse } from '@/lib/meilisearch/types'

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({
      query: q,
      results: { users: [], lyrics: [], artists: [], catalogLines: [] },
      processingTimeMs: 0,
    } satisfies MargoSearchResponse)
  }

  try {
    const { hits, processingTimeMs } = await searchMargoIndex(q, 8)
    const results = categorizeHits(hits, 8)
    return NextResponse.json({
      query: q,
      results,
      processingTimeMs,
    } satisfies MargoSearchResponse)
  } catch (e) {
    console.error('[search]', e)
    const message = e instanceof Error ? e.message : 'Search failed'
    const status = message.includes('MEILISEARCH') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

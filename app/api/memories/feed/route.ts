import { NextRequest, NextResponse } from 'next/server'
import { assembleMemoriesPublicBatch } from '@/lib/memory/assemble-batch'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'
import { createClient } from '@/lib/supabase/server'

const MAX_PAGE = 24
const DEFAULT_PAGE = 12
const CACHE = { 'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=120' }

export async function GET(request: NextRequest) {
  const limitRaw = Number.parseInt(request.nextUrl.searchParams.get('limit') || String(DEFAULT_PAGE), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), MAX_PAGE) : DEFAULT_PAGE
  const cursor = request.nextUrl.searchParams.get('cursor')?.trim() || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('memories')
    .select(MEMORY_ROW_SELECT)
    .eq('show_in_lyrics_feed', true)
    .eq('visibility', 'public')
    .is('content_removed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('[memories/feed]', error)
    return NextResponse.json({ memories: [], nextCursor: null, hasMore: false }, { headers: CACHE })
  }

  const slice = (rows || []).slice(0, limit)
  const hasMore = (rows || []).length > limit
  const nextCursor = hasMore && slice.length ? (slice[slice.length - 1].created_at as string) : null

  const assembled = await assembleMemoriesPublicBatch(slice, user?.id ?? null)
  const memories = assembled.filter((m) => m.visibility === 'public')

  return NextResponse.json({ memories, nextCursor, hasMore }, { headers: CACHE })
}

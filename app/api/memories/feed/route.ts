import { NextRequest, NextResponse } from 'next/server'
import { assembleMemoryPublic } from '@/lib/memory/assemble'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'
import { createClient } from '@/lib/supabase/server'

const MAX = 32
const CACHE = { 'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=120' }

export async function GET(request: NextRequest) {
  const limitRaw = Number.parseInt(request.nextUrl.searchParams.get('limit') || '24', 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), MAX) : 24

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows, error } = await supabase
    .from('memories')
    .select(MEMORY_ROW_SELECT)
    .eq('show_in_lyrics_feed', true)
    .eq('visibility', 'public')
    .is('content_removed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[memories/feed]', error)
    return NextResponse.json({ memories: [] }, { headers: CACHE })
  }

  const memories = []
  for (const row of rows || []) {
    const pub = await assembleMemoryPublic(row, user?.id ?? null)
    if (pub && pub.visibility === 'public') memories.push(pub)
  }

  return NextResponse.json({ memories }, { headers: CACHE })
}

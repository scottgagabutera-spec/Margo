import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureCatalogSongFromSearchHit } from '@/lib/catalog-song/ensure-catalog-row'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: {
    id?: string
    title?: string
    artist?: string
    artwork?: string | null
    source?: 'margo' | 'genius' | 'apple'
    margoSongId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.id?.trim() || !body.title?.trim() || !body.artist?.trim() || !body.source) {
    return NextResponse.json({ error: 'Incomplete song' }, { status: 400 })
  }

  const song = await ensureCatalogSongFromSearchHit({
    id: body.id.trim(),
    title: body.title.trim(),
    artist: body.artist.trim(),
    artwork: body.artwork,
    source: body.source,
    margoSongId: body.margoSongId,
  })

  if (!song) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 503 })
  }

  return NextResponse.json({ song })
}

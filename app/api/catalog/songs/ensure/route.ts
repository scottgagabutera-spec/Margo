import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureCatalogSongFromSearchHit } from '@/lib/catalog-song/ensure-catalog-row'
import { validateCatalogEnsureFields } from '@/lib/catalog-song/ensure-validation'

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

  const id = body.id.trim()
  const title = body.title.trim()
  const artist = body.artist.trim()
  const fieldErr = validateCatalogEnsureFields({
    id,
    title,
    artist,
    artwork: body.artwork,
  })
  if (fieldErr) {
    return NextResponse.json({ error: fieldErr }, { status: 400 })
  }

  const song = await ensureCatalogSongFromSearchHit({
    id,
    title,
    artist,
    artwork: body.artwork,
    source: body.source,
    margoSongId: body.margoSongId,
  })

  if (!song) {
    return NextResponse.json({ error: 'Feature not available' }, { status: 503 })
  }

  return NextResponse.json({ song })
}

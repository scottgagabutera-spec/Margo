import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { materializeCatalogArtistArtwork } from '@/lib/catalog-artist/ensure-catalog-row'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: { catalogArtistId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const id = body.catalogArtistId?.trim()
  if (!id) {
    return NextResponse.json({ error: 'catalogArtistId required' }, { status: 400 })
  }

  try {
    const artist = await materializeCatalogArtistArtwork(id)
    if (!artist) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ artist })
  } catch (e) {
    console.error('[artists/materialize]', e)
    return NextResponse.json({ error: 'Could not save artwork' }, { status: 500 })
  }
}

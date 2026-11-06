import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { presignedPutCatalogObject } from '@/lib/r2/catalog-upload-presign'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  const userId = !authErr ? authData?.user?.id ?? null : null
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: {
    songId?: unknown
    kind?: unknown
    extension?: unknown
    contentType?: unknown
    byteLength?: unknown
    artistLabel?: unknown
    songTitle?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const songId = typeof body.songId === 'string' ? body.songId.trim() : ''
  const kind = body.kind === 'audio' || body.kind === 'artwork' ? body.kind : null
  const extension = typeof body.extension === 'string' ? body.extension.trim().toLowerCase() : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : ''
  const byteLength = typeof body.byteLength === 'number' ? body.byteLength : NaN
  let artistLabel =
    typeof body.artistLabel === 'string' ? body.artistLabel.trim() : ''
  let songTitle = typeof body.songTitle === 'string' ? body.songTitle.trim() : ''

  if (!songId || !kind || !extension || !contentType || !Number.isFinite(byteLength)) {
    return NextResponse.json({ error: 'songId, kind, extension, contentType, byteLength required' }, { status: 400 })
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRe.test(songId)) {
    return NextResponse.json({ error: 'Invalid song id' }, { status: 400 })
  }

  try {
    const { data: row, error: rowErr } = await supabase
      .from('songs')
      .select('title, artist_display_name')
      .eq('id', songId)
      .eq('owner_profile_id', userId)
      .maybeSingle()

    if (row && !rowErr) {
      songTitle = typeof row.title === 'string' ? row.title.trim() : songTitle
      artistLabel =
        typeof row.artist_display_name === 'string'
          ? row.artist_display_name.trim()
          : artistLabel
    } else if (rowErr) {
      return NextResponse.json({ error: 'Could not verify song' }, { status: 500 })
    }

    if (!artistLabel?.trim() || !songTitle?.trim()) {
      return NextResponse.json(
        { error: 'artistLabel and songTitle are required for new songs' },
        { status: 400 },
      )
    }

    const out = await presignedPutCatalogObject({
      kind,
      profileId: userId,
      songId,
      artistLabel,
      songTitle,
      extension,
      contentType,
      byteLength,
    })
    return NextResponse.json({
      url: out.url,
      headers: out.headers,
      key: out.key,
      publicUrl: out.publicUrl,
      expiresAt: out.expiresAt,
      expiresInSec: out.expiresInSec,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create upload URL'
    console.error('[studio/catalog-upload-url]', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

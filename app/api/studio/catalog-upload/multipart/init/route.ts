import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { beginCatalogMultipart } from '@/lib/r2/catalog-multipart'
import type { CatalogUploadPresignInput } from '@/lib/r2/catalog-upload-presign'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  const userId = !authErr ? authData?.user?.id ?? null : null
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const songId = String(body.songId || '').trim()
  const kind = body.kind === 'artwork' ? 'artwork' : body.kind === 'audio' ? 'audio' : null
  const extension = String(body.extension || '').trim().toLowerCase()
  const contentType = String(body.contentType || '').trim()
  const byteLength = typeof body.byteLength === 'number' ? body.byteLength : NaN
  let artistLabel = String(body.artistLabel || '').trim()
  let songTitle = String(body.songTitle || '').trim()

  if (!songId || !kind || !extension || !contentType || !Number.isFinite(byteLength)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: row } = await supabase
    .from('songs')
    .select('title, artist_display_name')
    .eq('id', songId)
    .eq('owner_profile_id', userId)
    .maybeSingle()
  if (row) {
    songTitle = typeof row.title === 'string' ? row.title.trim() : songTitle
    artistLabel = typeof row.artist_display_name === 'string' ? row.artist_display_name.trim() : artistLabel
  }

  const input: CatalogUploadPresignInput = {
    kind,
    profileId: userId,
    songId,
    artistLabel,
    songTitle,
    extension,
    contentType,
    byteLength,
  }

  try {
    const out = await beginCatalogMultipart(input)
    return NextResponse.json(out)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start upload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

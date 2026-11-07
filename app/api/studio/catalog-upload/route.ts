import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { putCatalogObjectServer } from '@/lib/r2/put-catalog-object'
import type { CatalogUploadPresignInput } from '@/lib/r2/catalog-upload-presign'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_PROXY_BYTES = 6 * 1024 * 1024

/** Fallback when browser PUT to R2 fails (CORS). Artwork and small audio only. */
export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  const userId = !authErr ? authData?.user?.id ?? null : null
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }
  if (file.size > MAX_PROXY_BYTES) {
    return NextResponse.json(
      { error: 'File too large for this upload path. Use a stable connection and retry the direct upload.' },
      { status: 413 },
    )
  }

  const songId = String(form.get('songId') || '').trim()
  const kind = form.get('kind') === 'artwork' ? 'artwork' : form.get('kind') === 'audio' ? 'audio' : null
  const extension = String(form.get('extension') || '').trim().toLowerCase()
  const contentType = String(form.get('contentType') || file.type || '').trim()
  let artistLabel = String(form.get('artistLabel') || '').trim()
  let songTitle = String(form.get('songTitle') || '').trim()

  if (!songId || !kind || !extension || !contentType) {
    return NextResponse.json({ error: 'Missing upload fields' }, { status: 400 })
  }

  const { data: row } = await supabase
    .from('songs')
    .select('title, artist_display_name')
    .eq('id', songId)
    .eq('owner_profile_id', userId)
    .maybeSingle()

  if (row) {
    songTitle = typeof row.title === 'string' ? row.title.trim() : songTitle
    artistLabel =
      typeof row.artist_display_name === 'string' ? row.artist_display_name.trim() : artistLabel
  }

  const input: CatalogUploadPresignInput = {
    kind,
    profileId: userId,
    songId,
    artistLabel,
    songTitle,
    extension,
    contentType,
    byteLength: file.size,
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const out = await putCatalogObjectServer(input, buf)
    return NextResponse.json({ publicUrl: out.publicUrl, key: out.key, via: 'proxy' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
/** R2 catalog presign multipart: server uploads each part to the presigned object key. */
import { uploadCatalogPart } from '@/lib/r2/catalog-multipart'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_CHUNK = 3 * 1024 * 1024 + 256 * 1024

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  const userId = !authErr ? authData?.user?.id ?? null : null
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const form = await request.formData()
  const chunk = form.get('chunk')
  const uploadId = String(form.get('uploadId') || '')
  const key = String(form.get('key') || '')
  const partNumber = Number(form.get('partNumber'))

  if (!(chunk instanceof Blob) || !uploadId || !key || !Number.isFinite(partNumber)) {
    return NextResponse.json({ error: 'Invalid part' }, { status: 400 })
  }
  if (chunk.size > MAX_CHUNK) {
    return NextResponse.json({ error: 'Chunk too large' }, { status: 413 })
  }

  const buf = Buffer.from(await chunk.arrayBuffer())
  try {
    const etag = await uploadCatalogPart(key, uploadId, partNumber, buf)
    return NextResponse.json({ etag })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Part upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
/** Completes R2 presign multipart upload to catalog bucket. */
import { completeCatalogMultipart } from '@/lib/r2/catalog-multipart'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  const userId = !authErr ? authData?.user?.id ?? null : null
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: {
    uploadId?: string
    key?: string
    parts?: { partNumber: number; etag: string }[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const uploadId = String(body.uploadId || '')
  const key = String(body.key || '')
  const parts = Array.isArray(body.parts) ? body.parts : []
  if (!uploadId || !key || parts.length === 0) {
    return NextResponse.json({ error: 'Missing completion data' }, { status: 400 })
  }

  try {
    const out = await completeCatalogMultipart(key, uploadId, parts)
    return NextResponse.json(out)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not finish upload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

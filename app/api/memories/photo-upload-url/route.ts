import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { presignMemoryPhotoUpload } from '@/lib/r2/memory-photo-presign'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: {
    draftId?: string
    position?: number
    contentType?: string
    byteLength?: number
    kind?: 'image' | 'video' | 'poster'
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const draftId = body.draftId?.trim()
  const position = body.position ?? 0
  const contentType = body.contentType?.trim() || 'image/webp'
  const byteLength = body.byteLength ?? 0
  if (!draftId || !Number.isFinite(position)) {
    return NextResponse.json({ error: 'draftId and position required' }, { status: 400 })
  }

  try {
    const presign = await presignMemoryPhotoUpload({
      profileId: user.id,
      draftId,
      position,
      contentType,
      byteLength,
      kind: body.kind,
    })
    return NextResponse.json(presign)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Presign failed'
    const configGap = /not configured/i.test(msg)
    return NextResponse.json(
      {
        error: configGap
          ? 'Upload storage is not configured on this deployment (R2 env vars missing on Vercel preview).'
          : msg,
      },
      { status: configGap ? 503 : 400 },
    )
  }
}

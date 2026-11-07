import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assembleMemoryPublic } from '@/lib/memory/assemble'
import { isMemoryVideoR2Key } from '@/lib/r2/memory-media-keys'
import type { MemoryPhotoInput } from '@/lib/memory/types'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'

type Ctx = { params: Promise<{ id: string }> }

type PhotoBody = MemoryPhotoInput & {
  mediaType?: 'image' | 'video'
  durationSec?: number | null
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: { photos?: PhotoBody[]; coverR2Key?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const photos = (body.photos || []).slice(0, 10)
  const coverKey = body.coverR2Key?.trim() || photos[0]?.r2Key || null

  const admin = getSupabaseAdmin()
  const { data: owned } = await admin
    .from('memories')
    .select('id')
    .eq('id', id)
    .eq('owner_profile_id', user.id)
    .is('content_removed_at', null)
    .maybeSingle()

  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: existing } = await admin.from('memory_photos').select('id, r2_key').eq('memory_id', id)
  const keepKeys = new Set(photos.map((p) => p.r2Key))
  const toDelete = (existing || []).filter((row) => !keepKeys.has(row.r2_key as string))

  if (toDelete.length) {
    await admin.from('memory_photos').delete().in(
      'id',
      toDelete.map((r) => r.id as string),
    )
  }

  for (const p of photos) {
    const row = (existing || []).find((e) => e.r2_key === p.r2Key)
    const video = p.mediaType === 'video' || isMemoryVideoR2Key(p.r2Key)
    const payload: Record<string, unknown> = {
      memory_id: id,
      position: p.position,
      r2_key: p.r2Key,
      width: p.width ?? null,
      height: p.height ?? null,
    }
    if (video) {
      payload.media_type = 'video'
      payload.duration_sec = p.durationSec ?? null
      payload.mime_type = 'video/mp4'
    } else {
      payload.media_type = 'image'
      payload.mime_type = 'image/webp'
    }
    if (row) {
      await admin.from('memory_photos').update(payload).eq('id', row.id as string)
    } else {
      await admin.from('memory_photos').insert(payload)
    }
  }

  await admin.from('memories').update({ cover_r2_key: coverKey }).eq('id', id)

  const { data: fresh } = await admin.from('memories').select(MEMORY_ROW_SELECT).eq('id', id).maybeSingle()
  if (!fresh) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const pub = await assembleMemoryPublic(fresh, user.id)
  return NextResponse.json({ memory: pub })
}

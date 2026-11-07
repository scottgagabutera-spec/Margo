import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assembleMemoryPublic } from '@/lib/memory/assemble'
import type { MemoryVisibility } from '@/lib/memory/types'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: row, error } = await supabase
    .from('memories')
    .select(MEMORY_ROW_SELECT)
    .eq('id', id)
    .is('content_removed_at', null)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const pub = await assembleMemoryPublic(row, user?.id ?? null)
  if (!pub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ memory: pub })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  let body: {
    visibility?: MemoryVisibility
    showInLyricsFeed?: boolean
    showDatePublicly?: boolean
    title?: string
    story?: string
    mood?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (body.visibility) patch.visibility = body.visibility
  if (typeof body.showInLyricsFeed === 'boolean') patch.show_in_lyrics_feed = body.showInLyricsFeed
  if (typeof body.showDatePublicly === 'boolean') patch.show_date_publicly = body.showDatePublicly
  if (body.title !== undefined) patch.title = body.title.trim().slice(0, 120)
  if (body.story !== undefined) patch.story = body.story.trim().slice(0, 500) || null
  if (body.mood !== undefined) patch.mood = body.mood.trim().slice(0, 40) || null

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: row, error: updErr } = await admin
    .from('memories')
    .update(patch)
    .eq('id', id)
    .eq('owner_profile_id', user.id)
    .select(MEMORY_ROW_SELECT)
    .maybeSingle()

  if (updErr || !row) {
    return NextResponse.json({ error: 'Could not update' }, { status: 400 })
  }

  const pub = await assembleMemoryPublic(row, user.id)
  return NextResponse.json({ memory: pub })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: row, error: delErr } = await admin
    .from('memories')
    .update({ content_removed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_profile_id', user.id)
    .is('content_removed_at', null)
    .select('id')
    .maybeSingle()

  if (delErr || !row) {
    return NextResponse.json({ error: 'Could not delete' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, id })
}

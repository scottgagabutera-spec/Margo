import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import {
  assertSongOwnerOrAdmin,
  TRASH_RETENTION_MS,
} from '@/lib/studio/songs-server'
import { syncSongMeilisearchVisibility } from '@/lib/studio/meilisearch-song-visibility'
import { deleteSongMediaObjects } from '@/lib/studio/song-media-delete'

export const runtime = 'nodejs'

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: songId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const gate = await assertSongOwnerOrAdmin(admin, songId, user.id)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const now = new Date().toISOString()

  if (body.action === 'hide') {
    if (gate.row.status === 'archived') {
      return NextResponse.json({ error: 'Song is in Trash' }, { status: 400 })
    }
    const next = gate.row.status === 'hidden' ? 'live' : 'hidden'
    const { error } = await admin
      .from('songs')
      .update({ status: next, updated_at: now })
      .eq('id', songId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await syncSongMeilisearchVisibility(songId)
    return NextResponse.json({ ok: true, status: next })
  }

  if (body.action === 'soft_delete') {
    if (gate.row.status === 'archived') {
      return NextResponse.json({ error: 'Already in Trash' }, { status: 400 })
    }
    const purgeAfter = new Date(Date.now() + TRASH_RETENTION_MS).toISOString()
    const { error } = await admin
      .from('songs')
      .update({
        pre_delete_status: gate.row.status,
        status: 'archived',
        deleted_at: now,
        purge_after: purgeAfter,
        updated_at: now,
      })
      .eq('id', songId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await syncSongMeilisearchVisibility(songId)
    return NextResponse.json({ ok: true, purgeAfter })
  }

  if (body.action === 'restore') {
    if (gate.row.status !== 'archived' || !gate.row.deleted_at) {
      return NextResponse.json({ error: 'Not in Trash' }, { status: 400 })
    }
    const prev = gate.row.pre_delete_status
    const nextStatus =
      prev && prev !== 'archived'
        ? prev
        : 'hidden'
    const { error } = await admin
      .from('songs')
      .update({
        status: nextStatus,
        deleted_at: null,
        purge_after: null,
        pre_delete_status: null,
        updated_at: now,
      })
      .eq('id', songId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await syncSongMeilisearchVisibility(songId)
    return NextResponse.json({ ok: true, status: nextStatus })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: songId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const gate = await assertSongOwnerOrAdmin(admin, songId, user.id)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  await deleteSongMediaObjects(admin, gate.row.audio_url, gate.row.artwork_url)

  const { error } = await admin.from('songs').delete().eq('id', songId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await syncSongMeilisearchVisibility(songId)

  return NextResponse.json({ ok: true })
}

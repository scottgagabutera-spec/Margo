import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import {
  assertSongOwnerOrAdmin,
  TRASH_RETENTION_MS,
} from '@/lib/studio/songs-server'
import { syncSongMeilisearchVisibility } from '@/lib/studio/meilisearch-song-visibility'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { ids?: string[]; action?: 'hide' | 'soft_delete' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === 'string') : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }
  if (!body.action || (body.action !== 'hide' && body.action !== 'soft_delete')) {
    return NextResponse.json({ error: 'action must be hide or soft_delete' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const now = new Date().toISOString()
  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const songId of ids) {
    const gate = await assertSongOwnerOrAdmin(admin, songId, user.id)
    if (!gate.ok) {
      results.push({ id: songId, ok: false, error: gate.error })
      continue
    }
    if (gate.row.status === 'archived') {
      results.push({ id: songId, ok: false, error: 'in_trash' })
      continue
    }

    if (body.action === 'hide') {
      const { error } = await admin
        .from('songs')
        .update({ status: 'hidden', updated_at: now })
        .eq('id', songId)
      if (error) {
        results.push({ id: songId, ok: false, error: error.message })
        continue
      }
      await syncSongMeilisearchVisibility(songId)
      results.push({ id: songId, ok: true })
      continue
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
    if (error) {
      results.push({ id: songId, ok: false, error: error.message })
      continue
    }
    await syncSongMeilisearchVisibility(songId)
    results.push({ id: songId, ok: true })
  }

  return NextResponse.json({ ok: true, results })
}

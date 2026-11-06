import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { deleteSongMediaObjects } from '@/lib/studio/song-media-delete'
import { syncSongMeilisearchVisibility } from '@/lib/studio/meilisearch-song-visibility'

export const runtime = 'nodejs'
export const maxDuration = 120

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

/**
 * Hard-delete songs past purge_after: removes DB row (cascades lyric data) and best-effort storage.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await admin
    .from('songs')
    .select('id, title, audio_url, artwork_url, purge_after')
    .eq('status', 'archived')
    .not('purge_after', 'is', null)
    .lte('purge_after', nowIso)
    .limit(25)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let purged = 0

  for (const row of rows || []) {
    await deleteSongMediaObjects(admin, row.audio_url as string | null, row.artwork_url as string | null)
    const { error: delErr } = await admin.from('songs').delete().eq('id', row.id as string)
    if (!delErr) {
      purged++
      await syncSongMeilisearchVisibility(row.id as string)
    }
  }

  return NextResponse.json({ ok: true, candidates: (rows || []).length, purged })
}

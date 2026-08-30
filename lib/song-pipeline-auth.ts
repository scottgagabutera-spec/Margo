import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type SongPipelineAuth =
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }

/**
 * Session required. If songId is set, caller must own the song or be admin.
 * Used by /api/whisper and /api/tag-vibes so lyric rewrite is not public.
 */
export async function assertSongPipelineAccess(songId?: string | null): Promise<SongPipelineAuth> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!songId) {
    return { ok: true, userId: user.id }
  }

  const admin = getSupabaseAdmin()
  const { data: song, error: songErr } = await admin
    .from('songs')
    .select('id, owner_profile_id')
    .eq('id', songId)
    .maybeSingle()

  if (songErr || !song) {
    return { ok: false, res: NextResponse.json({ error: 'songId not found' }, { status: 404 }) }
  }

  if (song.owner_profile_id === user.id) {
    return { ok: true, userId: user.id }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_admin === true) {
    return { ok: true, userId: user.id }
  }

  return { ok: false, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}

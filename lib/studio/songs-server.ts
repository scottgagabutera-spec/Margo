import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function profileIsAdmin(profileId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { data } = await admin.from('profiles').select('is_admin').eq('id', profileId).maybeSingle()
  return data?.is_admin === true
}

export async function assertSongOwnerOrAdmin(
  admin: SupabaseClient,
  songId: string,
  profileId: string,
): Promise<{ ok: true; row: {
  id: string
  owner_profile_id: string
  title: string
  status: string
  audio_url: string | null
  artwork_url: string | null
  deleted_at: string | null
  purge_after: string | null
  pre_delete_status: string | null
} } | { ok: false; status: number; error: string }> {
  const { data: song, error } = await admin
    .from('songs')
    .select('id, owner_profile_id, title, status, audio_url, artwork_url, deleted_at, purge_after, pre_delete_status')
    .eq('id', songId)
    .maybeSingle()
  if (error || !song) {
    return { ok: false, status: 404, error: 'Song not found' }
  }
  if (song.owner_profile_id === profileId) {
    return { ok: true, row: song as any }
  }
  const isAdmin = await profileIsAdmin(profileId)
  if (isAdmin) {
    return { ok: true, row: song as any }
  }
  return { ok: false, status: 403, error: 'Forbidden' }
}

export function isSongPubliclyHiddenStatus(status: string): boolean {
  return status === 'hidden' || status === 'draft' || status === 'processing' || status === 'archived'
}

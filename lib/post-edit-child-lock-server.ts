import type { SupabaseClient } from '@supabase/supabase-js'
import {
  lyricBackSongOrLineChanged,
  momentPrimaryLineChanged,
  POST_EDIT_CHILD_LOCK_MESSAGE,
  type LyricBackWriteSnapshot,
  type MomentLineSnapshot,
} from '@/lib/post-edit-child-lock'

export async function postHasActiveLyricBackChildren(
  admin: SupabaseClient,
  postId: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc('post_has_active_lyric_back_children', {
    p_post_id: postId,
  })
  if (error) {
    if (!/post_has_active_lyric_back_children|42883|does not exist/i.test(`${error.message} ${error.code}`)) {
      console.error('[post-edit-child-lock] rpc failed:', error)
    }
    const { count, error: countErr } = await admin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('parent_post_id', postId)
      .is('content_removed_at', null)
    if (countErr) return true
    return (count ?? 0) > 0
  }
  return Boolean(data)
}

export async function guardLyricBackPatchWithChildren(
  admin: SupabaseClient,
  postId: string,
  before: LyricBackWriteSnapshot,
  after: LyricBackWriteSnapshot,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hasChildren = await postHasActiveLyricBackChildren(admin, postId)
  if (!hasChildren) return { ok: true }
  if (!lyricBackSongOrLineChanged(before, after)) return { ok: true }
  return { ok: false, error: POST_EDIT_CHILD_LOCK_MESSAGE }
}

export async function guardMomentPatchWithChildren(
  admin: SupabaseClient,
  postId: string,
  before: MomentLineSnapshot,
  after: MomentLineSnapshot,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hasChildren = await postHasActiveLyricBackChildren(admin, postId)
  if (!hasChildren) return { ok: true }
  if (!momentPrimaryLineChanged(before, after)) return { ok: true }
  return { ok: false, error: POST_EDIT_CHILD_LOCK_MESSAGE }
}

/** Re-check children immediately before write (narrows edit-time race). */
export async function recheckChildLockBeforeWrite(
  admin: SupabaseClient,
  postId: string,
  songOrLineChanged: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!songOrLineChanged) return { ok: true }
  const hasChildren = await postHasActiveLyricBackChildren(admin, postId)
  if (!hasChildren) return { ok: true }
  return { ok: false, error: POST_EDIT_CHILD_LOCK_MESSAGE }
}

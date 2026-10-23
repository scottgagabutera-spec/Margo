import type { SupabaseClient } from '@supabase/supabase-js'

/** True when the post has visible Lyric Backs (active child replies). */
export async function postHasActiveLyricBackChildren(
  admin: SupabaseClient,
  postId: string,
): Promise<boolean> {
  const { count, error } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('parent_post_id', postId)
    .eq('status', 'active')
  if (error) {
    console.error('[lyric-back] active child count failed', error.message)
    return true
  }
  return (count ?? 0) > 0
}

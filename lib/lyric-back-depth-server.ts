import type { SupabaseClient } from '@supabase/supabase-js'
import { LYRIC_BACK_DEPTH_CAP } from './lyric-back-depth.ts'

/** Depth of a post in a Lyric Back chain (root moment = 0). */
export async function lyricBackPostDepth(
  admin: SupabaseClient,
  postId: string,
): Promise<number | null> {
  let depth = 0
  let currentId: string | null = postId
  for (let guard = 0; guard < 32 && currentId; guard += 1) {
    const { data: row, error }: { data: { parent_post_id: string | null } | null; error: unknown } =
      await admin
      .from('posts')
      .select('parent_post_id')
      .eq('id', currentId)
      .maybeSingle()
    if (error || !row) return null
    if (!row.parent_post_id) return depth
    depth += 1
    currentId = row.parent_post_id
  }
  return null
}

/** Reject creating a child when the new row would exceed the depth cap. */
export function lyricBackChildDepthAllowed(parentDepth: number): boolean {
  return parentDepth + 1 <= LYRIC_BACK_DEPTH_CAP
}

export function lyricBackDepthCapErrorMessage(): string {
  return 'This thread is too deep for another Lyric Back.'
}

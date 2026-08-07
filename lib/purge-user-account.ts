// Shared hard-delete of all known user-owned rows. Used by
// app/api/delete-account and scripts/verify-account-deletion.mjs.
// Prefer calling RPC purge_user_account_data when the migration is applied
// (single transaction); this module is the fail-loud fallback / verifier.

import type { SupabaseClient } from '@supabase/supabase-js'

async function mustDelete(
  label: string,
  result: { error: { message: string } | null },
): Promise<void> {
  if (result.error) {
    throw new Error(`[${label}] ${result.error.message}`)
  }
}

/**
 * Deletes every known user-referencing row for p_user_id.
 * Not wrapped in a Postgres transaction unless the caller uses the RPC.
 */
export async function purgeUserAccountDataJs(
  admin: SupabaseClient,
  userId: string,
  username: string,
): Promise<void> {
  // Authored posts + full reply trees under them (any author on replies)
  const authored: string[] = []
  {
    const { data, error } = await admin
      .from('posts')
      .select('id')
      .eq('author_profile_id', userId)
    if (error) throw new Error(`[list authored posts] ${error.message}`)
    for (const row of data || []) authored.push(row.id)
  }

  const tree = new Set<string>(authored)
  let frontier = [...authored]
  while (frontier.length > 0) {
    const { data, error } = await admin
      .from('posts')
      .select('id')
      .in('parent_post_id', frontier)
    if (error) throw new Error(`[list child posts] ${error.message}`)
    frontier = []
    for (const row of data || []) {
      if (!tree.has(row.id)) {
        tree.add(row.id)
        frontier.push(row.id)
      }
    }
  }

  const postIds = [...tree]

  if (postIds.length > 0) {
    await mustDelete(
      'post_resonates by post',
      await admin.from('post_resonates').delete().in('post_id', postIds),
    )
    await mustDelete(
      'post_reports by post',
      await admin.from('post_reports').delete().in('post_id', postIds),
    )
    await mustDelete(
      'post_replays by post',
      await admin.from('post_replays').delete().in('post_id', postIds),
    )
    await mustDelete(
      'post_stats by post',
      await admin.from('post_stats').delete().in('post_id', postIds),
    )
    await mustDelete(
      'notifications by post',
      await admin.from('notifications').delete().in(
        'post_id',
        postIds.map((id) => String(id)),
      ),
    )

    // Leaf-first: repeat until no posts from the tree remain
    let remaining = new Set(postIds)
    let guard = 0
    while (remaining.size > 0 && guard < 50) {
      guard++
      const ids = [...remaining]
      const { data: children, error: childErr } = await admin
        .from('posts')
        .select('parent_post_id')
        .in('parent_post_id', ids)
      if (childErr) throw new Error(`[find leaves] ${childErr.message}`)
      const hasChild = new Set(
        (children || []).map((c) => c.parent_post_id).filter(Boolean) as string[],
      )
      const leaves = ids.filter((id) => !hasChild.has(id))
      if (leaves.length === 0) {
        throw new Error('[delete posts] stuck — cyclic parent_post_id or FK blocker')
      }
      await mustDelete(
        'posts leaf batch',
        await admin.from('posts').delete().in('id', leaves),
      )
      for (const id of leaves) remaining.delete(id)
    }
    if (remaining.size > 0) {
      throw new Error('[delete posts] could not delete all posts in tree')
    }
  }

  // Actor on others' content (uuid + username / legacy display actor)
  await mustDelete(
    'post_resonates by actor uuid',
    await admin.from('post_resonates').delete().eq('actor_id', userId),
  )
  if (username) {
    await mustDelete(
      'post_resonates by actor username',
      await admin.from('post_resonates').delete().eq('actor_id', username),
    )
  }

  await mustDelete(
    'post_replays by replayer',
    await admin.from('post_replays').delete().eq('replayer_id', userId),
  )
  await mustDelete(
    'post_reports by reporter',
    await admin.from('post_reports').delete().eq('reporter_id', userId),
  )

  await mustDelete(
    'song_resonates by actor uuid',
    await admin.from('song_resonates').delete().eq('actor_id', userId),
  )
  if (username) {
    await mustDelete(
      'song_resonates by actor username',
      await admin.from('song_resonates').delete().eq('actor_id', username),
    )
  }

  await mustDelete(
    'notifications recipient',
    await admin.from('notifications').delete().eq('recipient_id', userId),
  )
  await mustDelete(
    'notifications actor',
    await admin.from('notifications').delete().eq('actor_id', userId),
  )

  await mustDelete(
    'messages',
    await admin.from('messages').delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
  )
  await mustDelete(
    'follows',
    await admin.from('follows').delete().or(`follower_id.eq.${userId},followee_id.eq.${userId}`),
  )

  await mustDelete(
    'artist_applications',
    await admin.from('artist_applications').delete().eq('profile_id', userId),
  )

  // Explicit song delete (songs.owner_profile_id has no ON DELETE CASCADE)
  await mustDelete(
    'songs',
    await admin.from('songs').delete().eq('owner_profile_id', userId),
  )

  await mustDelete(
    'profiles',
    await admin.from('profiles').delete().eq('id', userId),
  )

  const { data: stillThere, error: checkErr } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (checkErr) throw new Error(`[profiles verify] ${checkErr.message}`)
  if (stillThere) throw new Error('[profiles] still exists after delete')
}

export type StorageBucket = 'avatars' | 'song-audio' | 'song-artwork'

export async function removeUserStoragePrefix(
  admin: SupabaseClient,
  bucket: StorageBucket,
  userId: string,
): Promise<void> {
  const { data: entries, error: listError } = await admin.storage
    .from(bucket)
    .list(userId, { limit: 1000 })

  if (listError) {
    const msg = listError.message || String(listError)
    if (/not found|does not exist/i.test(msg)) return
    throw new Error(`[storage:${bucket}] list failed: ${msg}`)
  }

  if (!entries || entries.length === 0) return

  const paths = entries
    .filter((e) => e.name && e.name !== '.emptyFolderPlaceholder')
    .map((e) => `${userId}/${e.name}`)

  if (paths.length === 0) return

  const { error: removeError } = await admin.storage.from(bucket).remove(paths)
  if (removeError) {
    throw new Error(`[storage:${bucket}] remove failed: ${removeError.message}`)
  }
}

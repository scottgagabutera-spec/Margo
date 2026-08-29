'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/hooks/usePosts'
import { mapPostLinesRows } from '@/lib/post-lines'
import { SONG_POST_EMBED } from '@/lib/atmosphere'

const supabase = createClient()

const PRIVATE_POST_SELECT = `
  id, text, emotion, status, song_title, artist_name, artwork_url, created_at, author_profile_id,
  post_lines (
    id, position, text, song_id, song_title, artist_name, artwork_url,
    snippet_start_sec, snippet_end_sec, source,
    songs:song_id ( ${SONG_POST_EMBED} )
  )
`

/**
 * Owner-only private lyrics (status = 'private').
 * Relies on RLS "owners read own posts" (auth.uid() = author_profile_id).
 * Never call with enabled=true for a profile that isn't the signed-in user —
 * the query is scoped to authorId === auth user in practice via RLS + eq.
 */
export function useOwnPrivatePosts(authorId: string | null, enabled: boolean) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(PRIVATE_POST_SELECT)
      .eq('author_profile_id', id)
      .eq('status', 'private')
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('useOwnPrivatePosts: failed to load', error)
      setPosts([])
      setLoading(false)
      return
    }

    setPosts(
      (data ?? []).map((row: any) => ({
        id: row.id,
        text: row.text ?? undefined,
        emotion: row.emotion ?? undefined,
        status: row.status ?? 'private',
        knowledge: (row.song_title || row.artist_name || row.artwork_url)
          ? {
              song: row.song_title ?? undefined,
              artist: row.artist_name ?? undefined,
              artwork: row.artwork_url ?? null,
            }
          : undefined,
        authorUid: row.author_profile_id ?? null,
        timestamp: row.created_at ? new Date(row.created_at).getTime() : undefined,
        // Multi-line Moments join post_lines above — resolveMomentLines
        // (used by PostCard etc.) prefers this over the text/knowledge
        // mirror whenever it's present, matching Feed/Post Detail/main
        // Profile. Single-line posts have no post_lines rows, so this is
        // undefined and the existing mirror fallback is unchanged.
        lines: mapPostLinesRows(row.post_lines),
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!enabled || !authorId) {
      setPosts([])
      setLoading(false)
      return
    }
    load(authorId)
  }, [enabled, authorId, load])

  return { posts, loading, reload: () => (authorId ? load(authorId) : undefined) }
}

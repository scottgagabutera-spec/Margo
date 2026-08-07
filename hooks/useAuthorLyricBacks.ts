'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/hooks/usePosts'

const supabase = createClient()

/**
 * Lyric Backs authored by a profile (posts with parent_post_id set).
 * Separate from useEchoes (children of one parent) and usePosts (top-level only).
 */
export function useAuthorLyricBacks(authorId: string | null, enabled: boolean) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!authorId || !enabled) {
      setPosts([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        text,
        emotion,
        status,
        song_id,
        song_title,
        artist_name,
        artwork_url,
        author_profile_id,
        created_at,
        snippet_start_sec,
        snippet_end_sec,
        parent_post_id,
        profiles:author_profile_id ( username, display_name, avatar_url ),
        post_stats ( resonate_count, echo_count, replay_count ),
        songs:song_id ( audio_url )
      `)
      .eq('author_profile_id', authorId)
      .not('parent_post_id', 'is', null)
      .not('status', 'in', '("hidden","private")')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('useAuthorLyricBacks', error)
      setPosts([])
      setLoading(false)
      return
    }

    setPosts(
      (data ?? []).map((row: any) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const stats = Array.isArray(row.post_stats) ? row.post_stats[0] : row.post_stats
        const linkedSong = Array.isArray(row.songs) ? row.songs[0] : row.songs
        return {
          id: row.id,
          text: row.text ?? undefined,
          emotion: row.emotion ?? undefined,
          status: row.status ?? undefined,
          knowledge: (row.song_title || row.artist_name || row.artwork_url)
            ? {
                song: row.song_title ?? undefined,
                artist: row.artist_name ?? undefined,
                artwork: row.artwork_url ?? null,
              }
            : undefined,
          username: profile?.username ?? null,
          authorUid: row.author_profile_id ?? null,
          authorAvatarUrl: profile?.avatar_url ?? null,
          authorDisplayName: profile?.display_name ?? null,
          timestamp: row.created_at ? new Date(row.created_at).getTime() : undefined,
          resonates: stats?.resonate_count ?? 0,
          replies: stats?.echo_count ?? 0,
          replays: stats?.replay_count ?? 0,
          songId: row.song_id ?? null,
          audioUrl: linkedSong?.audio_url ?? null,
          snippetStart: row.snippet_start_sec ?? null,
          snippetEnd: row.snippet_end_sec ?? null,
        } satisfies Post
      })
    )
    setLoading(false)
  }, [authorId, enabled])

  useEffect(() => { void load() }, [load])

  return { posts, loading, reload: load }
}

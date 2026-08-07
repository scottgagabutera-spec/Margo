'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/hooks/usePosts'

const supabase = createClient()

/** Replays this profile made (for profile Replays tab). */
export interface ProfileReplayItem {
  id: string
  createdAt: number
  quoteText: string | null
  post: Post
}

const SELECT = `
  id,
  quote_text,
  created_at,
  posts:post_id (
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
    profiles:author_profile_id ( username, display_name, avatar_url ),
    post_stats ( resonate_count, echo_count, replay_count ),
    songs:song_id ( audio_url )
  )
`

function mapPost(row: any): Post | null {
  if (!row || row.status === 'hidden' || row.status === 'private') return null
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
  }
}

export function useProfileReplays(profileId: string | null, enabled: boolean) {
  const [items, setItems] = useState<ProfileReplayItem[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!profileId || !enabled) {
      setItems([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('post_replays')
      .select(SELECT)
      .eq('replayer_id', profileId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('useProfileReplays', error)
      setItems([])
      setLoading(false)
      return
    }

    const next: ProfileReplayItem[] = []
    for (const row of data ?? []) {
      const postRow = Array.isArray(row.posts) ? row.posts[0] : row.posts
      const post = mapPost(postRow)
      if (!post) continue
      next.push({
        id: row.id,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
        quoteText: row.quote_text ?? null,
        post,
      })
    }
    setItems(next)
    setLoading(false)
  }, [profileId, enabled])

  useEffect(() => { void load() }, [load])

  return { items, loading, reload: load }
}

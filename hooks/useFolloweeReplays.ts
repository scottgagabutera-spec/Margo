'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import type { Post } from '@/hooks/usePosts'
import { PRIMARY_TAB_STALE_MS } from '@/hooks/usePosts'

const supabase = createClient()

export interface FolloweeReplay {
  id: string
  createdAt: number
  quoteText: string | null
  replayerId: string
  replayerUsername: string | null
  replayerDisplayName: string | null
  replayerAvatarUrl: string | null
  post: Post
}

const REPLAY_FEED_SELECT = `
  id,
  quote_text,
  created_at,
  replayer_id,
  profiles:replayer_id ( username, display_name, avatar_url ),
  posts:post_id (
    id,
    text,
    emotion,
    status,
    song_id,
    song_title,
    artist_name,
    artwork_url,
    youtube_video_id,
    youtube_title,
    youtube_thumbnail,
    youtube_channel,
    youtube_url,
    legacy_author_label,
    author_profile_id,
    created_at,
    snippet_start_sec,
    snippet_end_sec,
    parent_post_id,
    profiles:author_profile_id ( username, display_name, avatar_url ),
    post_stats ( resonate_count, echo_count, replay_count ),
    songs:song_id ( audio_url )
  )
`

function mapPost(row: any): Post | null {
  if (!row || row.status === 'hidden' || row.status === 'private') return null
  // Re-replaying a Replay is out of scope — only surface top-level originals here.
  // Nested replies as replay targets: still allowed (they're real posts with parent_post_id).
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
    youtubeMeta: row.youtube_video_id
      ? {
          videoId: row.youtube_video_id,
          title: row.youtube_title,
          thumbnail: row.youtube_thumbnail,
          thumbnailSm: row.youtube_thumbnail,
          channel: row.youtube_channel,
          youtubeUrl: row.youtube_url,
          embedUrl: `https://www.youtube.com/embed/${row.youtube_video_id}`,
        }
      : null,
    username: profile?.username ?? row.legacy_author_label ?? null,
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

/**
 * Recent Replays from accepted followees (+ the viewer), for interleaving
 * into the main feed with attribution. Not a following-only feed — originals
 * still come from usePosts; this only injects Replay wrappers.
 */
export function useFolloweeReplays(
  limit = 80,
  options: { enabled?: boolean } = {}
) {
  const enabled = options.enabled ?? true
  const { user } = useIdentity()
  const [replays, setReplays] = useState<FolloweeReplay[]>([])
  const [loading, setLoading] = useState(false)
  const lastLoadedAtRef = useRef(0)

  const load = useCallback(async () => {
    if (!user?.id) {
      setReplays([])
      return
    }
    setLoading(true)

    const { data: followRows, error: followErr } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted')

    if (followErr) {
      console.error('useFolloweeReplays: follows', followErr)
      setReplays([])
      setLoading(false)
      return
    }

    const replayerIds = Array.from(
      new Set([user.id, ...(followRows ?? []).map(r => r.followee_id).filter(Boolean)])
    )

    const { data, error } = await supabase
      .from('post_replays')
      .select(REPLAY_FEED_SELECT)
      .in('replayer_id', replayerIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('useFolloweeReplays: replays', error)
      setReplays([])
      setLoading(false)
      return
    }

    const mapped: FolloweeReplay[] = []
    for (const row of data ?? []) {
      const postRow = Array.isArray(row.posts) ? row.posts[0] : row.posts
      const post = mapPost(postRow)
      if (!post) continue
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      mapped.push({
        id: row.id,
        createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
        quoteText: row.quote_text ?? null,
        replayerId: row.replayer_id,
        replayerUsername: profile?.username ?? null,
        replayerDisplayName: profile?.display_name ?? null,
        replayerAvatarUrl: profile?.avatar_url ?? null,
        post,
      })
    }
    setReplays(mapped)
    setLoading(false)
    lastLoadedAtRef.current = Date.now()
  }, [user?.id, limit])

  useEffect(() => {
    if (!enabled) return

    const neverLoaded = lastLoadedAtRef.current === 0
    const stale = Date.now() - lastLoadedAtRef.current > PRIMARY_TAB_STALE_MS
    if (neverLoaded || stale) {
      void load()
    }

    if (!user?.id) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    // Unique topic per mount — fixed `followee-replays-${id}` races under
    // keepalive remount / Strict Mode the same way posts-feed did.
    try {
      const topic = `followee-replays:${user.id}:${crypto.randomUUID()}`
      channel = supabase
        .channel(topic)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'post_replays' }, () => { void load() })
        .subscribe()
    } catch (err) {
      console.error('followee-replays realtime failed', err)
    }
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [enabled, user?.id, load])

  return { replays, loading, reload: load }
}

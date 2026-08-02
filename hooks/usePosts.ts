'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useVisibleAuthorIds } from '@/hooks/useVisibleAuthorIds'

export interface Post {
  id: string
  text?: string
  emotion?: string
  status?: string
  knowledge?: { song?: string; artist?: string; artwork?: string | null }
  youtubeMeta?: { videoId?: string | null; title?: string | null; thumbnail?: string | null; thumbnailSm?: string | null; channel?: string | null; youtubeUrl?: string | null; embedUrl?: string | null } | null
  username?: string | null
  authorUid?: string | null
  authorAvatarUrl?: string | null
  timestamp?: number
  resonates?: number
  replies?: number
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
}

// ── Shape note, migrated Aug 1, 2026 ──────────────────────────────────
// Kept field names matching the old Firebase Post shape (timestamp,
// knowledge, authorUid, etc.) even though the underlying Supabase
// columns are named differently (created_at, song_title, author_
// profile_id) — this is a deliberate compatibility choice so existing
// components consuming usePosts()/usePost() don't need a rewrite, only
// this mapping layer changes. audioUrl is left null here: it lives on
// the linked `songs` row (songs.audio_url), not on posts directly — join
// it in later if/when a consumer actually needs it.
//
// Behavior change from the Firebase version: this only returns TOP-LEVEL
// posts (parent_post_id is null). The old version didn't structurally
// separate top-level posts from echoes/replies at all — replies now have
// their own real rows with parent_post_id set, so they're excluded from
// the main feed query by design, not fetched and filtered client-side.
// If replies need to show inline in the feed again, remove the
// `.is('parent_post_id', null)` filter below.

const POST_SELECT = `
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
  profiles:author_profile_id ( username, avatar_url ),
  post_stats ( resonate_count, echo_count ),
  songs:song_id ( audio_url )
`

function mapRow(row: any): Post {
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
    timestamp: row.created_at ? new Date(row.created_at).getTime() : undefined,
    resonates: stats?.resonate_count ?? 0,
    replies: stats?.echo_count ?? 0,
    songId: row.song_id ?? null,
    audioUrl: linkedSong?.audio_url ?? null,
    snippetStart: row.snippet_start_sec ?? null,
    snippetEnd: row.snippet_end_sec ?? null,
  }
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .is('parent_post_id', null)
      .not('status', 'in', '("hidden","private")')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('usePosts: failed to load posts', error)
      setPosts([])
      setLoading(false)
      return
    }
    setPosts((data ?? []).map(mapRow))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    // Mirrors the old Firebase onValue live-update behavior. Requires
    // Realtime to be enabled on the `posts` table in Supabase (Database
    // → Replication) — if it isn't, this subscription silently does
    // nothing and the feed just won't live-update (initial load above
    // still works fine either way).
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  // Same privacy-filtering hook as before, unchanged — still a
  // display-layer filter only, not a substitute for RLS enforcement.
  const authorUids = useMemo(() => posts.map(p => p.authorUid), [posts])
  const visibleAuthorIds = useVisibleAuthorIds(authorUids)

  const visiblePosts = useMemo(() => {
    return posts.filter(p => !p.authorUid || visibleAuthorIds.has(p.authorUid))
  }, [posts, visibleAuthorIds])

  return { posts: visiblePosts, loading }
}
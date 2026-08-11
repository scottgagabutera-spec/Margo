'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/hooks/usePosts'

const supabase = createClient()

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
  songs:song_id ( audio_url ),
  post_lines (
    id,
    position,
    text,
    song_id,
    song_title,
    artist_name,
    artwork_url,
    snippet_start_sec,
    snippet_end_sec,
    source,
    songs:song_id ( audio_url )
  )
`

function mapPostLines(raw: any[] | null | undefined) {
  if (!raw || raw.length === 0) return undefined
  return [...raw]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((row) => {
      const linked = Array.isArray(row.songs) ? row.songs[0] : row.songs
      return {
        id: row.id,
        position: row.position ?? 0,
        text: row.text ?? '',
        songId: row.song_id ?? null,
        songTitle: row.song_title ?? null,
        artistName: row.artist_name ?? null,
        artworkUrl: row.artwork_url ?? null,
        audioUrl: linked?.audio_url ?? null,
        snippetStart: row.snippet_start_sec ?? null,
        snippetEnd: row.snippet_end_sec ?? null,
        source: row.source || 'external',
      }
    })
}

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
    lines: mapPostLines(row.post_lines),
  }
}

export function usePost(postId: string | null) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('usePost: failed to load post', error)
      setPost(null)
      setLoading(false)
      return
    }
    setPost(data ? mapRow(data) : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!postId) {
      setPost(null)
      setLoading(false)
      return
    }
    setLoading(true)
    load(postId)

    // Requires Realtime enabled on the `posts` table (Database →
    // Replication) — same caveat as usePosts. Without it this just
    // means the post won't live-update; the initial load still works.
    const channel = supabase
      .channel(`post-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
        () => load(postId)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, load])

  return { post, loading }
}
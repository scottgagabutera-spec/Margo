/**
 * Shared mapping for Feed Replay attribution cards
 * (post_replays → ReplayAttribution). Used by useRecentReplays (Feed discovery).
 */
import type { Post } from '@/hooks/usePosts'

export interface FeedReplay {
  id: string
  createdAt: number
  quoteText: string | null
  replayerId: string
  replayerUsername: string | null
  replayerDisplayName: string | null
  replayerAvatarUrl: string | null
  post: Post
}

export const REPLAY_FEED_SELECT = `
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

export function mapReplayPost(row: any): Post | null {
  if (!row || row.status === 'hidden' || row.status === 'private') return null
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

export function mapReplayRows(data: any[] | null | undefined): FeedReplay[] {
  const mapped: FeedReplay[] = []
  for (const row of data ?? []) {
    const postRow = Array.isArray(row.posts) ? row.posts[0] : row.posts
    const post = mapReplayPost(postRow)
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
  return mapped
}

import { createClient } from '@/lib/supabase/server'
import { mapPostLinesRows } from '@/lib/post-lines'
import {
  resolveMargoMomentFromPost,
  type PostLikeForMoment,
} from '@/lib/moment/resolve'
import type { MargoMoment } from '@/lib/moment/types'

const MOMENT_POST_SELECT = `
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
  external_listen_url,
  profiles:author_profile_id ( username, avatar_url, display_name ),
  songs:song_id (
    audio_url,
    artwork_url,
    is_ai_generated,
    apple_music_url,
    spotify_url,
    youtube_url
  ),
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
    songs:song_id (
      audio_url,
      is_ai_generated,
      apple_music_url,
      spotify_url,
      youtube_url
    )
  )
`

function mapRowToPostLike(row: Record<string, unknown>): PostLikeForMoment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  const linkedSong = Array.isArray(row.songs) ? row.songs[0] : row.songs
  const profileRecord = profile as Record<string, unknown> | null | undefined
  const songRecord = linkedSong as Record<string, unknown> | null | undefined

  return {
    id: String(row.id),
    text: (row.text as string) ?? undefined,
    emotion: (row.emotion as string) ?? undefined,
    status: (row.status as string) ?? undefined,
    knowledge: (row.song_title || row.artist_name || row.artwork_url)
      ? {
          song: (row.song_title as string) ?? undefined,
          artist: (row.artist_name as string) ?? undefined,
          artwork: (row.artwork_url as string | null) ?? null,
        }
      : undefined,
    youtubeMeta: row.youtube_video_id
      ? {
          youtubeUrl: row.youtube_url as string | null,
          thumbnail: row.youtube_thumbnail as string | null,
        }
      : null,
    username: (profileRecord?.username as string) ?? (row.legacy_author_label as string) ?? null,
    authorUid: (row.author_profile_id as string) ?? null,
    authorAvatarUrl: (profileRecord?.avatar_url as string) ?? null,
    authorDisplayName: (profileRecord?.display_name as string) ?? null,
    songId: (row.song_id as string) ?? null,
    audioUrl: (songRecord?.audio_url as string) ?? null,
    snippetStart: row.snippet_start_sec != null ? Number(row.snippet_start_sec) : null,
    snippetEnd: row.snippet_end_sec != null ? Number(row.snippet_end_sec) : null,
    isAiGenerated: (songRecord?.is_ai_generated as boolean) ?? false,
    appleMusicUrl: (songRecord?.apple_music_url as string) ?? null,
    spotifyUrl: (songRecord?.spotify_url as string) ?? null,
    youtubeUrlFromSong: (songRecord?.youtube_url as string) ?? null,
    externalListenUrl: (row.external_listen_url as string) ?? null,
    lines: mapPostLinesRows(row.post_lines as Parameters<typeof mapPostLinesRows>[0]),
  }
}

export interface LoadedPublicMoment {
  moment: MargoMoment
  senderLabel: string | null
  artworkUrl: string | null
}

/** Load an active public Moment for recipient page + OG. Returns null when not found or private. */
export async function loadPublicMomentById(id: string): Promise<LoadedPublicMoment | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(MOMENT_POST_SELECT)
    .eq('id', id)
    .eq('status', 'active')
    .is('parent_post_id', null)
    .maybeSingle()

  if (error || !data) return null

  const post = mapRowToPostLike(data as Record<string, unknown>)
  const moment = resolveMargoMomentFromPost(post)

  const primaryLine = moment.lines[0]
  const artworkUrl =
    primaryLine?.artworkUrl ||
    post.knowledge?.artwork ||
    post.youtubeMeta?.thumbnail ||
    null

  const senderLabel =
    post.authorDisplayName ||
    (post.username ? `@${post.username}` : null) ||
    null

  return { moment, senderLabel, artworkUrl }
}

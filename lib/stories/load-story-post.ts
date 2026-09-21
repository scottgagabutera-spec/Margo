import { createClient } from '@/lib/supabase/client'
import { mapPostLinesRows } from '@/lib/post-lines'
import { parseAtmosphere } from '@/lib/atmosphere'
import {
  resolveMargoMomentFromPost,
  type PostLikeForMoment,
} from '@/lib/moment/resolve'
import type { MargoMoment, MomentShapeId, MomentThemeId } from '@/lib/moment/types'

const STORY_POST_SELECT = `
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
  export_shape_id,
  export_theme_id,
  export_atmosphere_id,
  profiles:author_profile_id ( username, avatar_url, display_name ),
  songs:song_id (
    audio_url,
    artwork_url,
    is_ai_generated,
    atmosphere,
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
      atmosphere,
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
          youtubeUrl: (row.youtube_url as string | null) ?? null,
          thumbnail: (row.youtube_thumbnail as string | null) ?? null,
        }
      : null,
    username: (profileRecord?.username as string) ?? (row.legacy_author_label as string) ?? null,
    authorUid: (row.author_profile_id as string) ?? null,
    authorAvatarUrl: (profileRecord?.avatar_url as string | null) ?? null,
    authorDisplayName: (profileRecord?.display_name as string | null) ?? null,
    songId: (row.song_id as string | null) ?? null,
    audioUrl: (songRecord?.audio_url as string | null) ?? null,
    snippetStart: row.snippet_start_sec != null ? Number(row.snippet_start_sec) : null,
    snippetEnd: row.snippet_end_sec != null ? Number(row.snippet_end_sec) : null,
    appleMusicUrl: (songRecord?.apple_music_url as string | null) ?? null,
    spotifyUrl: (songRecord?.spotify_url as string | null) ?? null,
    youtubeUrlFromSong: (songRecord?.youtube_url as string | null) ?? null,
    externalListenUrl: (row.external_listen_url as string | null) ?? null,
    exportShapeId: (row.export_shape_id as MomentShapeId | null) ?? null,
    exportThemeId: (row.export_theme_id as MomentThemeId | null) ?? null,
    exportAtmosphereId: parseAtmosphere(row.export_atmosphere_id as string | null),
    lines: mapPostLinesRows(row.post_lines as Parameters<typeof mapPostLinesRows>[0]),
  }
}

export async function loadStoryMoment(postId: string): Promise<MargoMoment | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('posts')
    .select(STORY_POST_SELECT)
    .eq('id', postId)
    .maybeSingle()

  if (error || !data) return null
  const postLike = mapRowToPostLike(data as Record<string, unknown>)
  return resolveMargoMomentFromPost(postLike, {
    shapeId: 'vertical',
    seedKey: `story:${postId}`,
  })
}

import { createClient } from '@/lib/supabase/client'
import { transformSongRowLight } from '@/lib/primary-tab-prefetch'
import type { Song } from '@/hooks/useSongs'

const supabase = createClient()

const SONG_PREVIEW_SELECT = `
  id, title, artist_display_name, artwork_url, audio_url, description,
  status, coming_soon_label, youtube_url, spotify_url,
  apple_music_url, soundcloud_url, audiomack_url, boomplay_url,
  is_ai_generated,
  song_stats ( plays, resonate_count, lyric_uses )
`

export type SongPreviewEnrich = Pick<
  Song,
  | 'description'
  | 'youtubeUrl'
  | 'spotifyUrl'
  | 'appleMusicUrl'
  | 'soundcloudUrl'
  | 'audiomackUrl'
  | 'boomplayUrl'
  | 'plays'
  | 'resonates'
  | 'lyricUses'
  | 'comingSoonLabel'
  | 'status'
>

export async function fetchSongPreviewEnrich(songId: string): Promise<SongPreviewEnrich | null> {
  const { data, error } = await supabase
    .from('songs')
    .select(SONG_PREVIEW_SELECT)
    .eq('id', songId)
    .maybeSingle()

  if (error || !data) {
    console.error('fetchSongPreviewEnrich: failed', error)
    return null
  }

  const song = transformSongRowLight(data as Parameters<typeof transformSongRowLight>[0])
  return {
    description: song.description,
    youtubeUrl: song.youtubeUrl,
    spotifyUrl: song.spotifyUrl,
    appleMusicUrl: song.appleMusicUrl,
    soundcloudUrl: song.soundcloudUrl,
    audiomackUrl: song.audiomackUrl,
    boomplayUrl: song.boomplayUrl,
    plays: song.plays,
    resonates: song.resonates,
    lyricUses: song.lyricUses,
    comingSoonLabel: song.comingSoonLabel,
    status: song.status,
  }
}

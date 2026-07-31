'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface LyricLine {
  lineIndex: number
  text: string
  startSec: number
  endSec: number
  vibes: string[]
}

export interface Song {
  id: string
  title: string
  artist: string
  artwork?: string | null
  youtubeUrl?: string | null
  audiomackUrl?: string | null
  spotifyUrl?: string | null
  appleMusicUrl?: string | null
  soundcloudUrl?: string | null
  boomplayUrl?: string | null
  audioUrl?: string | null
  description?: string | null
  order?: number | null
  status?: string
  comingSoonLabel?: string | null
  durationSec?: number | null
  plays?: number
  resonates?: number
  lyricUses?: number
  createdAt?: string
  lyricLines: LyricLine[]
}

// Raw shape returned by the Supabase embedded query — kept local to this
// file since it's only ever transformed, never passed around directly.
interface RawSongRow {
  id: string
  title: string
  artist_display_name: string
  artwork_url: string | null
  audio_url: string | null
  description: string | null
  status: string
  coming_soon_label: string | null
  order: number | null
  youtube_url: string | null
  spotify_url: string | null
  apple_music_url: string | null
  soundcloud_url: string | null
  audiomack_url: string | null
  boomplay_url: string | null
  duration_sec: number | null
  created_at: string
  song_stats: { plays: number; resonate_count: number; lyric_uses: number }[] | null
  lyric_lines: {
    id: string
    line_index: number
    text: string
    start_sec: number
    end_sec: number
    lyric_line_vibes: { vibe: string }[] | null
  }[] | null
}

function transformRow(row: RawSongRow): Song {
  const stats = row.song_stats?.[0]
  const lyricLines: LyricLine[] = (row.lyric_lines || [])
    .slice()
    .sort((a, b) => a.line_index - b.line_index)
    .map((l) => ({
      lineIndex: l.line_index,
      text: l.text,
      startSec: Number(l.start_sec),
      endSec: Number(l.end_sec),
      vibes: (l.lyric_line_vibes || []).map((v) => v.vibe),
    }))

  return {
    id: row.id,
    title: row.title,
    artist: row.artist_display_name,
    artwork: row.artwork_url,
    audioUrl: row.audio_url,
    description: row.description,
    status: row.status,
    comingSoonLabel: row.coming_soon_label,
    order: row.order,
    youtubeUrl: row.youtube_url,
    spotifyUrl: row.spotify_url,
    appleMusicUrl: row.apple_music_url,
    soundcloudUrl: row.soundcloud_url,
    audiomackUrl: row.audiomack_url,
    boomplayUrl: row.boomplay_url,
    durationSec: row.duration_sec,
    plays: stats?.plays ?? 0,
    resonates: stats?.resonate_count ?? 0,
    lyricUses: stats?.lyric_uses ?? 0,
    createdAt: row.created_at,
    lyricLines,
  }
}

const SONGS_SELECT = `
  id, title, artist_display_name, artwork_url, audio_url, description,
  status, coming_soon_label, order, youtube_url, spotify_url,
  apple_music_url, soundcloud_url, audiomack_url, boomplay_url,
  duration_sec, created_at,
  song_stats ( plays, resonate_count, lyric_uses ),
  lyric_lines (
    id, line_index, text, start_sec, end_sec,
    lyric_line_vibes ( vibe )
  )
`

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const songsRef = useRef<Song[]>([])
  useEffect(() => { songsRef.current = songs }, [songs])

  const fetchSongs = useCallback(async () => {
    const { data, error } = await supabase
      .from('songs')
      .select(SONGS_SELECT)
      .neq('status', 'hidden')
      .order('order', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('useSongs: failed to fetch songs', error)
      setLoading(false)
      return
    }

    setSongs(((data as unknown as RawSongRow[]) || []).map(transformRow))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSongs()

    // Live-update stats (plays / resonates / lyric uses) without a full
    // refetch — mirrors the old Firebase onValue behavior for songResonates,
    // but scoped to just the stats row that changed.
    const channel = supabase
      .channel('song_stats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_stats' },
        (payload) => {
          const updated = payload.new as { song_id: string; plays: number; resonate_count: number; lyric_uses: number } | null
          if (!updated) return
          setSongs((prev) =>
            prev.map((s) =>
              s.id === updated.song_id
                ? { ...s, plays: updated.plays, resonates: updated.resonate_count, lyricUses: updated.lyric_uses }
                : s
            )
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchSongs])

  return { songs, loading, refetch: fetchSongs }
}
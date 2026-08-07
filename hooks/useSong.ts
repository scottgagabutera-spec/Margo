'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Song } from '@/hooks/useSongs'

const supabase = createClient()

export interface LyricLine {
  id: number
  line: string
  start: number
  end: number
}

// Same shape as SONGS_SELECT in useSongs.ts, just scoped to a single row.
const SONG_SELECT = `
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
  const lyricLines = (row.lyric_lines || [])
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

export function useSong(id: string | null) {
  const [song, setSong] = useState<Song | null>(null)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setSong(null)
      setLyrics([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchSong() {
      const { data, error } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .eq('id', id as string)
        .single()

      if (cancelled) return

      if (error || !data) {
        console.error('useSong: failed to fetch song', error)
        setSong(null)
        setLyrics([])
        setLoading(false)
        return
      }

      const s = transformRow(data as unknown as RawSongRow)

      // Map from the shared LyricLine shape (lineIndex/text/startSec/endSec)
      // to the player-page shape (id/line/start/end).
      const mappedLyrics: LyricLine[] = s.lyricLines.map((l) => ({
        id: l.lineIndex,
        line: l.text,
        start: l.startSec,
        end: l.endSec,
      }))

      setSong(s)
      setLyrics(mappedLyrics)
      setLoading(false)
    }

    fetchSong()

    return () => { cancelled = true }
  }, [id])

  return { song, lyrics, loading }
}
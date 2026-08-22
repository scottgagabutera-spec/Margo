'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PRIMARY_TAB_STALE_MS,
  peekSongsCache,
  warmSongs,
} from '@/lib/primary-tab-prefetch'

const supabase = createClient()

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
  isAiGenerated?: boolean
  /**
   * Catalog fetch is light (no embed). Full lines come from `useSong(id)`
   * or Discover phase-2 `useLyricMoments`. Kept for compatibility; usually [].
   */
  lyricLines: LyricLine[]
}

export type UseSongsOptions = {
  /**
   * When false (inactive keepalive pane), tear down Realtime but keep
   * last React state. Default true for non-shell callers.
   */
  enabled?: boolean
}

export function useSongs(options: UseSongsOptions = {}) {
  const enabled = options.enabled ?? true
  const cached = peekSongsCache()
  const [songs, setSongs] = useState<Song[]>(cached?.data ?? [])
  const [loading, setLoading] = useState(!cached?.data)
  const lastLoadedAtRef = useRef(cached?.loadedAt ?? 0)
  const songsRef = useRef<Song[]>([])
  useEffect(() => { songsRef.current = songs }, [songs])

  const fetchSongs = useCallback(async (force = false) => {
    const mapped = await warmSongs({ force })
    setSongs(mapped)
    setLoading(false)
    lastLoadedAtRef.current = Date.now()
    return mapped
  }, [])

  useEffect(() => {
    if (!enabled) return

    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const neverLoaded = lastLoadedAtRef.current === 0
    const stale = Date.now() - lastLoadedAtRef.current > PRIMARY_TAB_STALE_MS
    if (neverLoaded || stale) {
      void fetchSongs(stale && !neverLoaded)
    }

    // Live-update stats only while the tab is enabled (no Realtime on warm).
    try {
      const topic = `song_stats_changes:${crypto.randomUUID()}`
      const next = supabase.channel(topic)
      next.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_stats' },
        (payload) => {
          if (!active) return
          const updated = payload.new as {
            song_id: string
            plays: number
            resonate_count: number
            lyric_uses: number
          } | null
          if (!updated) return
          setSongs((prev) =>
            prev.map((s) =>
              s.id === updated.song_id
                ? {
                    ...s,
                    plays: updated.plays,
                    resonates: updated.resonate_count,
                    lyricUses: updated.lyric_uses,
                  }
                : s
            )
          )
        }
      )
      next.subscribe()
      channel = next
    } catch (err) {
      console.error('useSongs: realtime subscribe failed', err)
    }

    return () => {
      active = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled, fetchSongs])

  return { songs, loading, refetch: () => fetchSongs(true) }
}

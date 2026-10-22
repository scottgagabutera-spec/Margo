'use client'

import { useMemo, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLyricMoments } from '@/hooks/useLyricMoments'
import { useSongs } from '@/hooks/useSongs'
import { buildLyricMomentsFromRows } from '@/lib/lyric-moments-board'
import {
  buildShortsShelfClips,
  meetsShortsMinimum,
} from '@/lib/shorts-shelf-rotation'

const supabase = createClient()

async function fetchShortsDisabledSongIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('songs')
    .select('id')
    .eq('status', 'live')
    .eq('shorts_enabled', false)
  if (error) {
    console.warn('shorts_enabled filter unavailable (migration not applied?)', error.message)
    return new Set()
  }
  return new Set((data || []).map((r) => r.id as string))
}

export function useFeedShortsClips(options: { enabled: boolean }) {
  const { moments: momentRows, songAtomsBySongId, loading: momentsLoading } = useLyricMoments({
    enabled: options.enabled,
  })
  const { songs, loading: songsLoading } = useSongs({ enabled: options.enabled })
  const [disabledSongIds, setDisabledSongIds] = useState<Set<string>>(() => new Set())
  const [disabledLoaded, setDisabledLoaded] = useState(false)

  useEffect(() => {
    if (!options.enabled) return
    let cancelled = false
    void fetchShortsDisabledSongIds().then((set) => {
      if (!cancelled) {
        setDisabledSongIds(set)
        setDisabledLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [options.enabled])

  const liveAudioSongIds = useMemo(() => {
    return new Set(
      songs
        .filter((s) => s.status === 'live' && !!s.audioUrl?.trim())
        .map((s) => s.id),
    )
  }, [songs])

  const shelf = useMemo(() => {
    const rows = momentRows.filter(
      (r) =>
        liveAudioSongIds.has(r.songId)
        && !!r.audioUrl?.trim()
        && !disabledSongIds.has(r.songId),
    )
    const atoms: typeof songAtomsBySongId = {}
    for (const id of liveAudioSongIds) {
      if (songAtomsBySongId[id]) atoms[id] = songAtomsBySongId[id]
    }
    const built = buildLyricMomentsFromRows(rows, atoms, {
      shuffle: false,
      curatedBySongId: {},
    })
    const now = new Date()
    return buildShortsShelfClips(built, now)
  }, [momentRows, songAtomsBySongId, liveAudioSongIds, disabledSongIds])

  const loading = momentsLoading || songsLoading || !disabledLoaded

  return {
    loading,
    clips: shelf.clips,
    eligibleSongCount: shelf.eligibleSongCount,
    meetsMinimum: meetsShortsMinimum(shelf.eligibleSongCount),
  }
}

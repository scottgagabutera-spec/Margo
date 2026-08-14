'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CatalogGrid } from '@/components/catalog-grid'
import { BackButton } from '@/components/back-button'
import { DiscoverVibeFilterRow } from '@/components/discover-vibe-filter-row'
import { LyricMomentCard } from '@/components/lyric-moment-card'
import { useLyricMoments } from '@/hooks/useLyricMoments'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { subscribeAudioEngine } from '@/lib/audio-engine'
import { buildLyricMomentsFromRows, momentPlayingKey, type LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentPool, queueLyricMoment } from '@/lib/lyric-moment-playback'

export default function LyricMomentsCatalogPage() {
  const { moments: momentRows, songAtomsBySongId, loading } = useLyricMoments()
  const { requireAuth } = useAuthGate()
  const [vibe, setVibe] = useState('ALL')
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [bufferingKey, setBufferingKey] = useState<string | null>(null)
  const playingRef = useRef(false)

  const allMoments = useMemo(
    () => buildLyricMomentsFromRows(momentRows, songAtomsBySongId),
    [momentRows, songAtomsBySongId],
  )

  const filtered = useMemo(
    () => vibe === 'ALL' ? allMoments : allMoments.filter(m => m.vibes.includes(vibe)),
    [allMoments, vibe],
  )

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (!state.playing || state.mode === 'idle' || state.mode === 'full') {
        setPlayingKey(null)
        setBufferingKey(null)
      } else if (state.snippet) {
        const key = `${state.songId}_${state.snippet.lineIndex}`
        setPlayingKey(key)
        setBufferingKey(state.buffering ? key : null)
      }
    })
  }, [])

  const playMoment = useCallback((moment: LyricMoment) => {
    if (playingRef.current) return
    playingRef.current = true
    window.setTimeout(() => { playingRef.current = false }, 80)
    playLyricMomentPool(moment, filtered)
  }, [filtered])

  const queueMoment = useCallback((moment: LyricMoment, mode: 'next' | 'add') => {
    if (!requireAuth()) return
    queueLyricMoment(moment, mode)
  }, [requireAuth])

  return (
    <CatalogGrid
      items={filtered}
      loading={loading}
      getKey={m => `${m.songId}_${m.lineId}_${m.start}_${m.end}`}
      getSearchText={m => `${m.line} ${m.songTitle} ${m.artist}`}
      searchPlaceholder="Search lines, songs, artists…"
      extraFilters={<DiscoverVibeFilterRow selected={vibe} onSelect={setVibe} />}
      emptyMessage={vibe === 'ALL' ? 'No lyric moments yet.' : `No lines tagged for ${vibe} yet.`}
      minCardWidth={240}
      topContent={<BackButton fallbackHref="/discover" />}
      renderCard={moment => {
        const key = momentPlayingKey(moment)
        return (
          <LyricMomentCard
            moment={moment}
            variant="grid"
            isPlaying={playingKey === key}
            isBuffering={bufferingKey === key}
            onClick={() => playMoment(moment)}
            onPlay={(e) => { e.stopPropagation(); playMoment(moment) }}
            onSelectVibe={setVibe}
            onPlayNext={() => queueMoment(moment, 'next')}
            onAddQueue={() => queueMoment(moment, 'add')}
          />
        )
      }}
    />
  )
}

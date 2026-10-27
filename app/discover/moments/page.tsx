'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DiscoverVibeFilterRow } from '@/components/discover-vibe-filter-row'
import { DiscoverViewMoreShell } from '@/components/discover-view-more-shell'
import { DiscoverBatchedGrid } from '@/components/discover-batched-grid'
import { LyricMomentCard } from '@/components/lyric-moment-card'
import { useLyricMoments } from '@/hooks/useLyricMoments'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { subscribeAudioEngine } from '@/lib/audio-engine'
import { buildLyricMomentsFromRows, momentPlayingKey, type LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentPool, queueLyricMoment } from '@/lib/lyric-moment-playback'
import { DISCOVER_VM_BATCH } from '@/lib/discover-view-more-layout'
import { filterMomentsByVibe } from '@/lib/discover-view-more-logic'

export default function LyricMomentsCatalogPage() {
  const { moments: momentRows, songAtomsBySongId, curatedBySongId, loading } = useLyricMoments()
  const { requireAuth } = useAuthGate()
  const [vibe, setVibe] = useState('ALL')
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [bufferingKey, setBufferingKey] = useState<string | null>(null)
  const playingRef = useRef(false)

  const allMoments = useMemo(
    () => buildLyricMomentsFromRows(momentRows, songAtomsBySongId, { curatedBySongId }),
    [momentRows, songAtomsBySongId, curatedBySongId],
  )

  const filtered = useMemo(
    () => filterMomentsByVibe(allMoments, vibe),
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

  const resetKey = `${vibe}:${filtered.length}`

  return (
    <DiscoverViewMoreShell
      title="Moments"
      gridKind="moments"
      vibeFilters={<DiscoverVibeFilterRow selected={vibe} onSelect={setVibe} />}
    >
      <DiscoverBatchedGrid
        kind="moments"
        items={filtered}
        batchSize={DISCOVER_VM_BATCH.moments}
        resetKey={resetKey}
        loading={loading}
        skeletonCount={DISCOVER_VM_BATCH.moments}
        getKey={m => `${m.songId}_${m.lineId}_${m.start}_${m.end}`}
        emptyMessage="Nothing here yet."
        renderItem={moment => {
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
    </DiscoverViewMoreShell>
  )
}

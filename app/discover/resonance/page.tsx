'use client'

import { useEffect, useMemo, useState } from 'react'
import { DiscoverVibeFilterRow } from '@/components/discover-vibe-filter-row'
import { DiscoverViewMoreShell } from '@/components/discover-view-more-shell'
import { DiscoverBatchedGrid } from '@/components/discover-batched-grid'
import { ResonanceCard } from '@/components/resonance-card'
import { usePosts, type Post } from '@/hooks/usePosts'
import { useSongs } from '@/hooks/useSongs'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { subscribeAudioEngine } from '@/lib/audio-engine'
import { playResonancePost, queueResonancePost } from '@/lib/resonance-snippet'
import { DISCOVER_VM_BATCH } from '@/lib/discover-view-more-layout'
import { filterPostsByVibe } from '@/lib/discover-view-more-logic'

export default function ResonanceCatalogPage() {
  const { posts, loading: postsLoading } = usePosts()
  const { songs, loading: songsLoading } = useSongs()
  const { requireAuth } = useAuthGate()
  const [vibe, setVibe] = useState('ALL')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [bufferingId, setBufferingId] = useState<string | null>(null)

  const songsById = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs])

  const resonances = useMemo(
    () => filterPostsByVibe(posts, vibe),
    [posts, vibe],
  )

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (!state.playing || state.mode !== 'snippet') {
        setPlayingId(null)
        setBufferingId(null)
        return
      }
      const match = resonances.find(p => p.songId === state.songId && p.text === state.snippet?.lineText)
      setPlayingId(match?.id ?? null)
      setBufferingId(state.buffering && match ? match.id : null)
    })
  }, [resonances])

  const playPost = (post: Post, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!post.songId) return
    playResonancePost(post, songsById.get(post.songId))
  }

  const queuePost = (post: Post, mode: 'next' | 'add') => {
    if (!requireAuth()) return
    if (!post.songId) return
    queueResonancePost(post, songsById.get(post.songId), mode)
  }

  const resetKey = `${vibe}:${resonances.length}`
  const loading = postsLoading || songsLoading

  return (
    <DiscoverViewMoreShell
      title="Resonance"
      gridKind="resonance"
      vibeFilters={<DiscoverVibeFilterRow selected={vibe} onSelect={setVibe} />}
    >
      <DiscoverBatchedGrid
        kind="resonance"
        items={resonances}
        batchSize={DISCOVER_VM_BATCH.resonance}
        resetKey={resetKey}
        loading={loading}
        skeletonCount={DISCOVER_VM_BATCH.resonance}
        getKey={p => p.id}
        emptyMessage="Nothing here yet."
        renderItem={post => (
          <ResonanceCard
            post={post}
            variant="grid"
            isPlaying={playingId === post.id}
            isBuffering={bufferingId === post.id}
            onPlay={(e) => playPost(post, e)}
            onSelectVibe={setVibe}
            onPlayNext={() => queuePost(post, 'next')}
            onAddQueue={() => queuePost(post, 'add')}
          />
        )}
      />
    </DiscoverViewMoreShell>
  )
}

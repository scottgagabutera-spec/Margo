'use client'

import { useEffect, useMemo, useState } from 'react'
import { CatalogGrid } from '@/components/catalog-grid'
import { BackButton } from '@/components/back-button'
import { DiscoverVibeFilterRow } from '@/components/discover-vibe-filter-row'
import { ResonanceCard } from '@/components/resonance-card'
import { usePosts, type Post } from '@/hooks/usePosts'
import { useSongs } from '@/hooks/useSongs'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { subscribeAudioEngine } from '@/lib/audio-engine'
import { playResonancePost, queueResonancePost } from '@/lib/resonance-snippet'

export default function ResonanceCatalogPage() {
  const { posts, loading: postsLoading } = usePosts()
  const { songs, loading: songsLoading } = useSongs()
  const { requireAuth } = useAuthGate()
  const [vibe, setVibe] = useState('ALL')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [bufferingId, setBufferingId] = useState<string | null>(null)

  const songsById = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs])

  const resonances = useMemo(() => {
    const base = posts.filter(p => p.songId && p.text)
    if (vibe === 'ALL') return base
    return base.filter(p => (p.emotion || '').toUpperCase() === vibe)
  }, [posts, vibe])

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

  return (
    <CatalogGrid
      items={resonances}
      loading={postsLoading || songsLoading}
      getKey={p => p.id}
      getSearchText={p => `${p.text || ''} ${p.knowledge?.song || ''} ${p.knowledge?.artist || ''} ${p.username || ''}`}
      searchPlaceholder="Search posts, songs, people…"
      extraFilters={<DiscoverVibeFilterRow selected={vibe} onSelect={setVibe} />}
      emptyMessage={vibe === 'ALL' ? 'No song posts yet.' : `No Resonance posts tagged ${vibe} yet.`}
      minCardWidth={240}
      topContent={<BackButton fallbackHref="/discover" />}
      renderCard={post => (
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
  )
}

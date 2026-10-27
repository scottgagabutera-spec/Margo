'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useSongs, Song } from '@/hooks/useSongs'
import { useLyricMoments } from '@/hooks/useLyricMoments'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/hooks/usePosts'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { SongPreviewSheet } from '@/components/song-preview-sheet'
import { LyricMomentCard } from '@/components/lyric-moment-card'
import { ResonanceCard } from '@/components/resonance-card'
import { DiscoverVibeFilterRow } from '@/components/discover-vibe-filter-row'
import { DiscoverSectionHeader } from '@/components/discover-section-header'
import { DiscoverHorizontalScrollRow } from '@/components/discover-horizontal-scroll-row'
import { DiscoverHomeSongTile, DiscoverHomeArtistTile } from '@/components/discover-home-tiles'
import { buildLyricMomentsFromRows, momentPlayingKey, type LyricMoment } from '@/lib/lyric-moments-board'
import { playLyricMomentPool, queueLyricMoment } from '@/lib/lyric-moment-playback'
import { playResonancePost, queueResonancePost } from '@/lib/resonance-snippet'
import {
  filterMomentsByVibe,
  filterPostsByVibe,
  filterSongsByVibe,
  songIdsForVibeFromMomentRows,
  sortArtistsCatalog,
} from '@/lib/discover-view-more-logic'
import { capDiscoverHomeSongs, lyricMomentsStableKey } from '@/lib/discover-home-logic'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useNotifications } from '@/hooks/useNotifications'
import { useMessaging } from '@/hooks/useMessaging'
import { createClient } from '@/lib/supabase/client'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { NewItemsPill } from '@/components/new-items-pill'
import { useNewItemsBuffer } from '@/hooks/useNewItemsBuffer'
import { usePrimaryTab } from '@/components/primary-tab-shell'
import { isExcludedDiscoverArtist } from '@/lib/discover-artist-roster'
import { subscribeAudioEngine, togglePlayPause } from '@/lib/audio-engine'
import { UI_FONT } from '@/lib/fonts'

const supabase = createClient()

interface ArtistPreview {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

function SectionBlock({
  reserveHeight,
  loading,
  skeleton,
  children,
  hidden,
}: {
  reserveHeight: number
  loading?: boolean
  skeleton: React.ReactNode
  children: ReactNode
  hidden?: boolean
}) {
  if (hidden) return null
  return (
    <section style={{ marginBottom: '22px', minHeight: reserveHeight }} data-discover-section>
      {loading ? skeleton : children}
    </section>
  )
}

function MomentRowSkeleton() {
  return (
    <DiscoverHorizontalScrollRow>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="discover-home-moment-card discover-home-skeleton" style={{ height: '168px' }} aria-hidden />
      ))}
    </DiscoverHorizontalScrollRow>
  )
}

function TileRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <DiscoverHorizontalScrollRow>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="discover-home-skeleton" style={{ width: '104px', height: '130px', flexShrink: 0, borderRadius: '12px' }} aria-hidden />
      ))}
    </DiscoverHorizontalScrollRow>
  )
}

export default function DiscoverPage() {
  const { isTabActive } = usePrimaryTab()
  const discoverLive = isTabActive('discover')
  const { songs, loading: songsLoading, refetch } = useSongs({ enabled: discoverLive })
  const {
    moments: momentRows,
    songAtomsBySongId,
    curatedBySongId,
    loading: momentsLoading,
    refetch: refetchMoments,
  } = useLyricMoments({ enabled: discoverLive })
  const { posts: livePosts, loading: postsLoading, reload: reloadPosts } = usePosts({ enabled: discoverLive })
  const {
    items: posts,
    pendingCount,
    flushPending,
    applyImmediate,
  } = useNewItemsBuffer(livePosts)
  const [ptrBusy, setPtrBusy] = useState(false)
  const [preview, setPreview] = useState<Song | null>(null)
  const [selectedVibe, setSelectedVibe] = useState('ALL')
  const [allMoments, setAllMoments] = useState<LyricMoment[]>([])
  const momentsStableKeyRef = useRef<string | null>(null)
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [bufferingKey, setBufferingKey] = useState<string | null>(null)
  const { requireAuth } = useAuthGate()
  const { refetch: refetchNotifications } = useNotifications()
  const { refetch: refetchMessages } = useMessaging()
  const playingRef = useRef(false)

  const [artists, setArtists] = useState<ArtistPreview[]>([])
  const [artistsLoading, setArtistsLoading] = useState(true)

  useEffect(() => {
    if (!discoverLive) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, artist_status')
      .eq('is_artist', true)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { console.error('Failed to load artists:', error); setArtistsLoading(false); return }
        const visible = (data || []).filter(
          (p) => p.artist_status !== 'frozen'
            && p.artist_status !== 'removed'
            && !isExcludedDiscoverArtist(p.username),
        )
        setArtists(sortArtistsCatalog(visible.map(p => ({
          id: p.id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          artistStatus: p.artist_status ?? null,
        }))).map(a => ({
          id: a.id,
          username: a.username,
          displayName: a.displayName,
          avatarUrl: a.avatarUrl,
        })))
        setArtistsLoading(false)
      })
    return () => { cancelled = true }
  }, [discoverLive])

  useEffect(() => {
    const key = lyricMomentsStableKey(momentRows)
    if (key === momentsStableKeyRef.current && allMoments.length > 0) return
    if (momentRows.length === 0 && allMoments.length === 0) return
    momentsStableKeyRef.current = key
    setAllMoments(buildLyricMomentsFromRows(momentRows, songAtomsBySongId, { curatedBySongId, shuffle: true }))
  }, [momentRows, songAtomsBySongId, curatedBySongId, allMoments.length])

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

  const filteredMoments = useMemo(
    () => filterMomentsByVibe(allMoments, selectedVibe),
    [allMoments, selectedVibe],
  )

  const vibeSongIds = useMemo(
    () => songIdsForVibeFromMomentRows(momentRows, selectedVibe),
    [momentRows, selectedVibe],
  )

  const filteredSongs = useMemo(
    () => capDiscoverHomeSongs(filterSongsByVibe(songs, vibeSongIds)),
    [songs, vibeSongIds],
  )

  const filteredPosts = useMemo(
    () => filterPostsByVibe(posts, selectedVibe),
    [posts, selectedVibe],
  )

  const toggleOrPlayMoment = useCallback((moment: LyricMoment) => {
    const key = momentPlayingKey(moment)
    if (playingKey === key) {
      togglePlayPause()
      return
    }
    if (playingRef.current) return
    playingRef.current = true
    window.setTimeout(() => { playingRef.current = false }, 80)
    playLyricMomentPool(moment, filteredMoments)
  }, [filteredMoments, playingKey])

  const playAllMoments = useCallback(() => {
    if (filteredMoments.length === 0) return
    playLyricMomentPool(filteredMoments[0], filteredMoments)
  }, [filteredMoments])

  const queueMoment = useCallback((moment: LyricMoment, mode: 'next' | 'add') => {
    if (!requireAuth()) return
    queueLyricMoment(moment, mode)
  }, [requireAuth])

  const onPtrRefresh = async () => {
    momentsStableKeyRef.current = null
    const [, , latest] = await Promise.all([
      refetch(),
      refetchMoments(),
      reloadPosts(),
      refetchNotifications(),
      refetchMessages(),
    ])
    applyImmediate(latest)
  }

  return (
    <PullToRefresh onRefreshingChange={setPtrBusy} onRefresh={onPtrRefresh}>
      <div className="discover-home-page" data-discover-home style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden', maxWidth: '100vw' }}>
        <style>{`
          .discover-home-page {
            --discover-home-pad-x: 16px;
            --discover-home-header-gap: 16px;
            box-sizing: border-box;
            padding-top: calc(var(--nav-height, 72px) + var(--discover-home-header-gap));
            padding-left: var(--discover-home-pad-x);
            padding-right: var(--discover-home-pad-x);
            padding-bottom: calc(var(--margo-page-padding-bottom, 96px) + 16px);
          }
          @media (min-width: 600px) {
            .discover-home-page {
              --discover-home-pad-x: 28px;
              --discover-home-header-gap: 28px;
            }
          }
          @media (min-width: 1024px) {
            .discover-home-page { --discover-home-pad-x: 48px; }
          }
          @media (min-width: 1440px) {
            .discover-home-page {
              --discover-home-pad-x: 64px;
              --discover-home-header-gap: 40px;
            }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .discover-home-inner { transform: scale(1.15); transform-origin: top center; }
          }
          .discover-home-inner {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }
          @media (min-width: 2560px) {
            .discover-home-inner {
              max-width: 1500px;
              transform: scale(1.4);
              transform-origin: top center;
            }
          }
          .discover-home-moment-card {
            width: 150px;
          }
          @media (min-width: 1024px) {
            .discover-home-moment-card { width: 236px; }
          }
          .discover-home-resonance-card {
            width: 210px;
          }
          @media (min-width: 1024px) {
            .discover-home-resonance-card { width: 300px; }
          }
          .discover-home-song-tile { width: 104px; }
          @media (min-width: 1024px) {
            .discover-home-song-tile { width: 150px; }
          }
          .discover-home-artist-tile { width: 64px; }
          @media (min-width: 1024px) {
            .discover-home-artist-tile { width: 84px; }
          }
          .discover-home-skeleton {
            background: var(--surface);
            border: 1px solid var(--border);
            animation: discoverHomePulse 1.4s ease-in-out infinite;
          }
          @keyframes discoverHomePulse {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.7; }
          }
        `}</style>

        {!ptrBusy && pendingCount > 0 && (
          <NewItemsPill count={pendingCount} onReveal={flushPending} noun="new lyrics" />
        )}

        {preview && (
          <SongPreviewSheet song={preview} onClose={() => setPreview(null)} />
        )}

        <div className="discover-home-inner">
          <div style={{ marginBottom: '12px' }}>
            <DiscoverVibeFilterRow selected={selectedVibe} onSelect={setSelectedVibe} tone="home" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
            <button
              type="button"
              data-discover-play-all
              onClick={playAllMoments}
              disabled={filteredMoments.length === 0}
              style={{
                fontFamily: UI_FONT,
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '8px 14px',
                minHeight: '44px',
                borderRadius: '50px',
                border: '1px solid var(--gold)',
                background: 'transparent',
                color: 'var(--gold)',
                cursor: filteredMoments.length === 0 ? 'default' : 'pointer',
                opacity: filteredMoments.length === 0 ? 0.45 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PlayPauseIcon playing={false} size={12} color="var(--gold)" /> Play all
            </button>
          </div>

          <SectionBlock
            reserveHeight={220}
            loading={momentsLoading && allMoments.length === 0}
            hidden={!momentsLoading && filteredMoments.length === 0}
            skeleton={(
              <>
                <DiscoverSectionHeader title="Moments" viewMoreHref="/discover/moments" />
                <MomentRowSkeleton />
              </>
            )}
          >
            <DiscoverSectionHeader title="Moments" viewMoreHref="/discover/moments" />
            <DiscoverHorizontalScrollRow>
              {filteredMoments.map(moment => {
                const key = momentPlayingKey(moment)
                return (
                  <LyricMomentCard
                    key={`${moment.songId}_${moment.lineId}_${moment.start}`}
                    moment={moment}
                    variant="discover"
                    isPlaying={playingKey === key}
                    isBuffering={bufferingKey === key}
                    onClick={() => toggleOrPlayMoment(moment)}
                    onPlay={(e) => { e.stopPropagation(); toggleOrPlayMoment(moment) }}
                    onSelectVibe={setSelectedVibe}
                    onPlayNext={() => queueMoment(moment, 'next')}
                    onAddQueue={() => queueMoment(moment, 'add')}
                  />
                )
              })}
            </DiscoverHorizontalScrollRow>
          </SectionBlock>

          <SectionBlock
            reserveHeight={180}
            loading={songsLoading && songs.length === 0}
            hidden={!songsLoading && filteredSongs.length === 0}
            skeleton={(
              <>
                <DiscoverSectionHeader title="Songs" viewMoreHref="/discover/songs" />
                <TileRowSkeleton />
              </>
            )}
          >
            <DiscoverSectionHeader title="Songs" viewMoreHref="/discover/songs" />
            <DiscoverHorizontalScrollRow>
              {filteredSongs.map(song => (
                <DiscoverHomeSongTile key={song.id} song={song} onSelect={() => setPreview(song)} />
              ))}
            </DiscoverHorizontalScrollRow>
          </SectionBlock>

          <SectionBlock
            reserveHeight={120}
            loading={artistsLoading && artists.length === 0}
            hidden={!artistsLoading && artists.length === 0}
            skeleton={(
              <>
                <DiscoverSectionHeader title="Artists" viewMoreHref="/artists" />
                <TileRowSkeleton count={5} />
              </>
            )}
          >
            <DiscoverSectionHeader title="Artists" viewMoreHref="/artists" />
            <DiscoverHorizontalScrollRow>
              {artists.map(artist => (
                <DiscoverHomeArtistTile
                  key={artist.id}
                  username={artist.username}
                  displayName={artist.displayName}
                  avatarUrl={artist.avatarUrl}
                />
              ))}
            </DiscoverHorizontalScrollRow>
          </SectionBlock>

          <ResonanceDiscoverSection
            posts={filteredPosts}
            songs={songs}
            loading={postsLoading && posts.length === 0}
            onSelectVibe={setSelectedVibe}
            requireAuth={requireAuth}
          />
        </div>
      </div>
    </PullToRefresh>
  )
}

function ResonanceDiscoverSection({
  posts,
  songs,
  loading,
  onSelectVibe,
  requireAuth,
}: {
  posts: Post[]
  songs: Song[]
  loading: boolean
  onSelectVibe: (v: string) => void
  requireAuth: () => boolean
}) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [bufferingId, setBufferingId] = useState<string | null>(null)
  const songsById = useMemo(() => new Map(songs.map(s => [s.id, s])), [songs])

  useEffect(() => {
    return subscribeAudioEngine(state => {
      if (!state.playing || state.mode !== 'snippet') {
        setPlayingId(null)
        setBufferingId(null)
        return
      }
      const match = posts.find(p => p.songId === state.songId && p.text === state.snippet?.lineText)
      setPlayingId(match?.id ?? null)
      setBufferingId(state.buffering && match ? match.id : null)
    })
  }, [posts])

  if (!loading && posts.length === 0) return null

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
    <SectionBlock
      reserveHeight={220}
      loading={loading}
      skeleton={(
        <>
          <DiscoverSectionHeader title="Resonance" viewMoreHref="/discover/resonance" />
          <MomentRowSkeleton />
        </>
      )}
    >
      <DiscoverSectionHeader title="Resonance" viewMoreHref="/discover/resonance" />
      <DiscoverHorizontalScrollRow>
        {posts.map(post => (
          <ResonanceCard
            key={post.id}
            post={post}
            variant="discover"
            isPlaying={playingId === post.id}
            isBuffering={bufferingId === post.id}
            onPlay={(e) => playPost(post, e)}
            onSelectVibe={onSelectVibe}
            onPlayNext={() => queuePost(post, 'next')}
            onAddQueue={() => queuePost(post, 'add')}
          />
        ))}
      </DiscoverHorizontalScrollRow>
    </SectionBlock>
  )
}

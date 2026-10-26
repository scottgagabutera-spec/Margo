'use client'
import { toast } from 'sonner'
import { CloseIcon } from '@/components/icons'
import { Suspense, useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/hooks/usePosts'
import { CardExportModal } from '@/components/card-export-modal'
import { resolveMargoMomentFromPost } from '@/lib/moment'
import { isNotificationAllowed } from '@/lib/notification-prefs'
import Link from 'next/link'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { useNotifications } from '@/hooks/useNotifications'
import { useMessaging } from '@/hooks/useMessaging'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { FeedNewMomentsPill } from '@/components/feed-new-moments-pill'
import { ContentUpdatesBar } from '@/components/content-updates-bar'
import { useNewItemsBuffer } from '@/hooks/useNewItemsBuffer'
import { useContentUpdates } from '@/hooks/useContentUpdates'
import { PostCard, normalizeEmotion } from '@/components/post-card'
import { FeedPostEvictProvider } from '@/components/feed-post-evict-context'
import { ReplayAttribution } from '@/components/replay-attribution'
import { useRecentReplays } from '@/hooks/useRecentReplays'
import { usePostReplays } from '@/hooks/usePostReplays'
import { usePrimaryTab, restoreActivePrimaryScroll } from '@/components/primary-tab-shell'
import { FeedPostSkeletonList } from '@/components/margo-skeletons'
import { FeedOceanFooter } from '@/components/feed-ocean-footer'
import { feedRankIds, feedSortScore } from '@/lib/feed-rank'
import { StoryRing } from '@/components/stories/story-ring'
import { StoriesPortalDock } from '@/components/stories/stories-portal-dock'
import { useMargoMobileViewport } from '@/components/stories/stories-dock'
import { StoryFeedAuthorSync, StoryRingProvider } from '@/components/stories/story-ring-context'
import { FeedFilterLiveRegion, FeedVibeFilterBar } from '@/components/feed-vibe-filter-bar'
import { FeedContentTabBar } from '@/components/feed-content-tab-bar'
import { FeedShortsPager } from '@/components/feed-shorts-pager'
import { MargoPaneErrorBoundary } from '@/components/margo-pane-error-boundary'
import { applyFeedContentTab, parseFeedContentTab } from '@/lib/feed-content-tab'
import { feedListReady } from '@/lib/feed-list-ready'
import { useFeedShortsClips } from '@/hooks/useFeedShortsClips'
import {
  E2E_SHORTS_FIXTURE_CLIPS,
  shouldUseE2eShortsFixture,
} from '@/lib/e2e-shorts-fixture'

const supabase = createClient()

// Soft-reload Feed-local Realtime payloads after pausing a hidden pane.
const FEED_STALE_MS = 60_000

export default function FeedPage() {
  return (
    <MargoPaneErrorBoundary surface="feed-pane">
      <Suspense fallback={<FeedPostSkeletonList count={4} />}>
        <FeedPageInner />
      </Suspense>
    </MargoPaneErrorBoundary>
  )
}

function FeedPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightParam = searchParams.get('highlight')
  const openLbParam = searchParams.get('openLb') === '1'
  const [autoOpenLyricBackPostId, setAutoOpenLyricBackPostId] = useState<string | null>(null)
  const { isTabActive } = usePrimaryTab()
  const feedLive = isTabActive('feed')
  const isMobileViewport = useMargoMobileViewport()
  const {
    posts: livePosts,
    loading,
    reload,
    loadOlder,
    loadingOlder,
    hasMoreOlder,
    removePost,
  } = usePosts({ enabled: feedLive })
  const {
    items: posts,
    seeded,
    pendingCount,
    flushPending,
    applyImmediate,
  } = useNewItemsBuffer(livePosts, { settleEmpty: !loading })
  const evictFeedPost = useCallback(
    (postId: string) => {
      removePost(postId)
      applyImmediate(livePosts.filter((p) => p.id !== postId))
    },
    [removePost, applyImmediate, livePosts],
  )
  const { songCount, artistCount, openSongs, openArtists } = useContentUpdates({
    enabled: feedLive,
  })
  const { replays: recentReplays } = useRecentReplays(80, { enabled: feedLive })
  const [ptrBusy, setPtrBusy] = useState(false)
  const { requireAuth } = useAuthGate()
  const { user, identity } = useIdentity()
  const { refetch: refetchNotifications } = useNotifications()
  const { refetch: refetchMessages } = useMessaging()
  const [selectedSort, setSelectedSort] = useState('NEW')
  const [filterAnnouncement, setFilterAnnouncement] = useState('')
  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const {
    replayed,
    repost,
    undoRepost,
    quoteRepost,
    countFor,
    quoteFor,
    reconcile,
  } = usePostReplays(feedLive)
  const [postStats, setPostStats] = useState<Record<string, { views?: number; resonateCount?: number; echoCount?: number; replayCount?: number }>>({})
  const [exportPost, setExportPost] = useState<Post | null>(null)
  const postStatsLoadedAtRef = useRef(0)
  const resonatesLoadedAtRef = useRef(0)
  const highlightHandledRef = useRef<string | null>(null)
  const [sharedLabel, setSharedLabel] = useState(false)
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null)

  useEffect(() => {
    if (!feedLive) return

    let cancelled = false
    async function loadStats() {
      const { data, error } = await supabase
        .from('post_stats')
        .select('post_id, views, resonate_count, echo_count, replay_count')
      if (cancelled) return
      if (error) { console.error('Failed to load post_stats:', error); return }
      const map: Record<string, { views?: number; resonateCount?: number; echoCount?: number; replayCount?: number }> = {}
      for (const row of data || []) {
        map[row.post_id] = { views: row.views, resonateCount: row.resonate_count, echoCount: row.echo_count, replayCount: row.replay_count }
      }
      setPostStats(map)
      const serverCounts: Record<string, number | undefined> = {}
      for (const id of Object.keys(map)) serverCounts[id] = map[id]?.replayCount
      reconcile(serverCounts)
      postStatsLoadedAtRef.current = Date.now()
    }
    const neverLoaded = postStatsLoadedAtRef.current === 0
    const stale = Date.now() - postStatsLoadedAtRef.current > FEED_STALE_MS
    if (neverLoaded || stale) loadStats()

    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      const next = supabase.channel(`feed-post-stats:${crypto.randomUUID()}`)
      next.on('postgres_changes', { event: '*', schema: 'public', table: 'post_stats' }, () => {
        if (!cancelled) loadStats()
      })
      next.subscribe()
      channel = next
    } catch (err) {
      console.error('feed-post-stats realtime failed', err)
    }

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [feedLive, reconcile])

  useEffect(() => {
    if (!feedLive || !user?.id) return
    const myId = user.id
    let cancelled = false
    async function loadMyResonates() {
      const { data, error } = await supabase
        .from('post_resonates')
        .select('post_id')
        .eq('actor_id', myId)
      if (cancelled) return
      if (error) { console.error('Failed to load resonates:', error); return }
      const mine = new Set((data || []).map(r => r.post_id))
      setResonated(mine)
      try { localStorage.setItem('margoResonated', JSON.stringify([...mine])) } catch {}
      resonatesLoadedAtRef.current = Date.now()
    }
    const neverLoaded = resonatesLoadedAtRef.current === 0
    const stale = Date.now() - resonatesLoadedAtRef.current > FEED_STALE_MS
    if (neverLoaded || stale) loadMyResonates()

    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      const next = supabase.channel(`feed-my-resonates:${crypto.randomUUID()}`)
      next.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_resonates', filter: `actor_id=eq.${myId}` },
        () => { if (!cancelled) loadMyResonates() }
      )
      next.subscribe()
      channel = next
    } catch (err) {
      console.error('feed-my-resonates realtime failed', err)
    }

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [feedLive, user?.id])

  // Feed rank: New = recency only. Trending/Top need mixed costly
  // actions (resonates, lyric-backs, replays) — views never unlock a
  // badge. See lib/feed-rank.ts.
  const { newIds, trendingIds, topIds } = useMemo(
    () => feedRankIds(posts, postStats),
    [posts, postStats],
  )

  const feedContentTab = useMemo(
    () => parseFeedContentTab(searchParams.get('tab')),
    [searchParams],
  )

  const selectedVibe = useMemo(() => {
    const raw = searchParams.get('vibe')?.trim()
    if (!raw) return 'ALL'
    return normalizeEmotion(raw)
  }, [searchParams])

  const {
    clips: shortsClips,
    loading: shortsLoading,
    meetsMinimum: shortsMeetsMinimum,
  } = useFeedShortsClips({ enabled: feedLive })

  const e2eShortsFixture = useMemo(() => {
    if (typeof window === 'undefined') return false
    return shouldUseE2eShortsFixture(searchParams, window.location.hostname)
  }, [searchParams])

  const resolvedShortsClips = e2eShortsFixture ? E2E_SHORTS_FIXTURE_CLIPS : shortsClips
  const resolvedShortsLoading = e2eShortsFixture ? false : shortsLoading
  const resolvedShortsMeetsMinimum = e2eShortsFixture || shortsMeetsMinimum

  const matchesFeedFilters = (p: Post) => {
    const norm = normalizeEmotion(p.emotion || '')
    return selectedVibe === 'ALL' || norm === selectedVibe
  }

  type FeedItem =
    | { kind: 'post'; key: string; post: Post; sortAt: number }
    | {
        kind: 'replay'
        key: string
        post: Post
        sortAt: number
        quoteText: string | null
        replayerUsername: string | null
        replayerDisplayName: string | null
        replayerAvatarUrl: string | null
      }

  const feedItems = useMemo((): FeedItem[] => {
    const originals: FeedItem[] = posts
      .filter(matchesFeedFilters)
      .map(p => ({
        kind: 'post' as const,
        key: `p-${p.id}`,
        post: p,
        sortAt: p.timestamp || 0,
      }))

    // Interleave recent reposts from anyone (global discovery). Originals
    // still come from usePosts; this only injects attribution wrappers.
    const replayItems: FeedItem[] = recentReplays
      .filter(r => matchesFeedFilters(r.post))
      .map(r => ({
        kind: 'replay' as const,
        key: `r-${r.id}`,
        post: r.post,
        sortAt: r.createdAt,
        quoteText: r.quoteText,
        replayerUsername: r.replayerUsername,
        replayerDisplayName: r.replayerDisplayName,
        replayerAvatarUrl: r.replayerAvatarUrl,
      }))

    const merged = [...originals, ...replayItems]
    if (selectedSort === 'NEW') {
      merged.sort((a, b) => b.sortAt - a.sortAt)
    } else {
      merged.sort((a, b) => feedSortScore(b.post, selectedSort, postStats) - feedSortScore(a.post, selectedSort, postStats))
    }
    return merged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, recentReplays, selectedVibe, selectedSort, postStats])

  const notifyResonate = async (post: Post) => {
    if (!user?.id) return
    if (!post.authorUid || post.authorUid === user.id) return
    try {
      if (!(await isNotificationAllowed(supabase, post.authorUid, 'resonate'))) return
      const { error } = await supabase.from('notifications').insert({
        recipient_id: post.authorUid,
        actor_id: user.id,
        type: 'resonate',
        post_id: post.id,
      })
      if (error) console.error('Failed to insert resonate notification:', error)
    } catch (err) {
      console.error('Failed to insert resonate notification:', err)
    }
  }

  const toggleResonate = async (postId: string) => {
    if (!requireAuth()) return
    if (!user?.id) return
    const already = resonated.has(postId)
    const myId = user.id
    setResonated(prev => {
      const next = new Set(prev)
      already ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem('margoResonated', JSON.stringify([...next])) } catch {}
      return next
    })
    setResonateCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (already ? -1 : 1)) }))

    try {
      if (already) {
        const { error } = await supabase.from('post_resonates').delete().eq('post_id', postId).eq('actor_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_resonates').insert({ post_id: postId, actor_id: myId })
        if (error) throw error
      }
      if (!already) {
        const post = posts.find(p => p.id === postId)
        if (post) void notifyResonate(post)
      }
    } catch {
      setResonated(prev => {
        const next = new Set(prev)
        already ? next.add(postId) : next.delete(postId)
        return next
      })
      setResonateCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (already ? 1 : -1)) }))
    }
  }

  const replayBase = (id: string, fallback = 0) =>
    countFor(id, postStats[id]?.replayCount, fallback)

  const handleExport = (post: Post) => {
    if (!requireAuth()) return
    setExportPost(post)
  }

  const handleFeedContentTab = (tab: 'lyrics' | 'shorts') => {
    const params = applyFeedContentTab(new URLSearchParams(searchParams.toString()), tab)
    const qs = params.toString()
    router.push(qs ? `/feed?${qs}` : '/feed', { scroll: false })
  }

  const handleSelectVibe = (vibe: string) => {
    const next = selectedVibe === vibe ? 'ALL' : vibe
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'ALL') {
      params.delete('vibe')
      setFilterAnnouncement('Showing all Moments')
      const qs = params.toString()
      router.push(qs ? `/feed?${qs}` : '/feed', { scroll: false })
      return
    }
    params.set('vibe', next.toLowerCase())
    setFilterAnnouncement(`Filtering by ${next.toLowerCase()}`)
    router.push(`/feed?${params.toString()}`, { scroll: false })
  }

  const clearVibeFilter = () => {
    if (selectedVibe === 'ALL') return
    handleSelectVibe(selectedVibe)
  }

  const handleSelectRank = (rank: 'NEW' | 'TRENDING' | 'TOP') => {
    setSelectedSort(prev => (prev === rank ? 'NEW' : rank))
  }

  const listReady = feedListReady(seeded, posts.length, loading)
  const showFeedSkeleton = !listReady && posts.length === 0
  const hasActiveFilter = selectedVibe !== 'ALL' || selectedSort !== 'NEW'

  useEffect(() => {
    if (!highlightParam || !feedLive) return
    void reload()
  }, [highlightParam, feedLive, reload])

  useEffect(() => {
    if (!highlightParam || !listReady) return
    const found = posts.some((p) => p.id === highlightParam)
    if (!found) return
    if (highlightHandledRef.current === highlightParam) return
    highlightHandledRef.current = highlightParam

    setHighlightPostId(highlightParam)
    setSharedLabel(true)
    if (openLbParam) setAutoOpenLyricBackPostId(highlightParam)
    router.replace('/feed', { scroll: false })

    const scrollTimer = window.setTimeout(() => {
      if (openLbParam) return
      const el = document.getElementById(`feed-post-${highlightParam}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)

    const labelTimer = window.setTimeout(() => setSharedLabel(false), 2600)
    const glowTimer = window.setTimeout(() => setHighlightPostId(null), 3200)

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(labelTimer)
      window.clearTimeout(glowTimer)
    }
  }, [highlightParam, listReady, openLbParam, posts, router])

  const restoredScrollRef = useRef(false)
  const restoreTriesRef = useRef(0)

  useLayoutEffect(() => {
    if (!feedLive) {
      restoredScrollRef.current = false
      restoreTriesRef.current = 0
      return
    }
    if (!listReady || highlightParam || restoredScrollRef.current) return
    restoreTriesRef.current += 1
    const result = restoreActivePrimaryScroll()
    const done = result.anchored
      || (result.applied && !result.waitingForAnchor)
      || restoreTriesRef.current >= 6
    if (done) {
      restoredScrollRef.current = true
      return
    }
    const frame = window.requestAnimationFrame(() => {
      const next = restoreActivePrimaryScroll()
      if (next.anchored || (next.applied && !next.waitingForAnchor)) {
        restoredScrollRef.current = true
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [feedLive, listReady, posts.length, highlightParam])

  const exportMoment = useMemo(
    () => (exportPost ? resolveMargoMomentFromPost(exportPost) : null),
    // Feed rebuilds `exportPost` on every parent render. Key on the opened post id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exportPost?.id],
  )

  const feedAuthorIds = useMemo(
    () => Array.from(new Set(posts.map((p) => p.authorUid).filter((id): id is string => !!id))),
    [posts],
  )

  const vibeFilterActive = selectedVibe !== 'ALL'
  const feedTopChrome = vibeFilterActive
    ? 'calc(var(--nav-height, 72px) + var(--margo-feed-tab-bar-h) + var(--margo-feed-vibe-bar-h))'
    : 'calc(var(--nav-height, 72px) + var(--margo-feed-tab-bar-h))'

  return (
    <StoryRingProvider enabled={feedLive}>
    <StoryFeedAuthorSync authorIds={feedAuthorIds} />
    <FeedPostEvictProvider evict={evictFeedPost}>
    <PullToRefresh
      enabled={feedContentTab !== 'shorts'}
      onRefreshingChange={setPtrBusy}
      onRefresh={async () => {
        const [latest] = await Promise.all([
          reload(),
          refetchNotifications(),
          refetchMessages(),
        ])
        applyImmediate(latest)
      }}
    >
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      position: 'relative',
      overflowX: 'hidden',
      paddingTop: feedContentTab === 'lyrics' ? feedTopChrome : feedTopChrome,
    }}>
      <FeedFilterLiveRegion message={filterAnnouncement} />
      <FeedContentTabBar
        active={feedContentTab}
        onChange={handleFeedContentTab}
        shortsAvailable={resolvedShortsMeetsMinimum}
      />
      {vibeFilterActive && (
        <FeedVibeFilterBar
          vibeKey={selectedVibe}
          resultCount={feedContentTab === 'lyrics' && listReady ? feedItems.length : null}
          onClear={clearVibeFilter}
        />
      )}
      {!ptrBusy && feedLive && pendingCount > 0 && (
        <FeedNewMomentsPill visible onReveal={flushPending} />
      )}
      {!ptrBusy && feedLive && (songCount > 0 || artistCount > 0) && (
        <ContentUpdatesBar
          songCount={songCount}
          artistCount={artistCount}
          onSongs={openSongs}
          onArtists={openArtists}
          topOffsetPx={pendingCount > 0 ? 52 : 0}
        />
      )}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-128px', left: '-128px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-160px', right: '-160px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      {feedContentTab === 'shorts' && (
        <FeedShortsPager
          clips={resolvedShortsClips}
          loading={resolvedShortsLoading}
          meetsMinimum={resolvedShortsMeetsMinimum}
          signedIn={!!user?.id}
          onRequireSignIn={() => requireAuth({ returnTo: '/feed?tab=shorts' })}
          vibeFilterActive={vibeFilterActive}
          tabActive={feedLive && feedContentTab === 'shorts'}
        />
      )}

      <main
        className={`margo-feed-column${feedContentTab === 'shorts' ? ' margo-feed-lyrics-pane--hidden' : ''}`}
        style={{ position: 'relative', zIndex: 5, padding: '16px 16px var(--margo-page-padding-bottom)' }}
        aria-hidden={feedContentTab === 'shorts'}
      >
        {feedLive && isMobileViewport !== true && (
          <div className="margo-story-ring-tray">
            <StoryRing
              onAddStory={() => {
                toast('Open a Moment and tap Add to Story in the export sheet.')
              }}
            />
          </div>
        )}

        {hasActiveFilter && (
          <div style={{ display: 'flex', gap: '6px', padding: '4px 0 16px' }}>
            {selectedSort !== 'NEW' && (
              <button
                type="button"
                onClick={() => setSelectedSort('NEW')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  minHeight: 'var(--margo-touch-min)',
                  padding: '4px 10px', borderRadius: '50px',
                  background: 'transparent', border: '1px solid var(--gold-border)', cursor: 'pointer',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.55rem', fontWeight: 700,
                  letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)',
                }}
              >{selectedSort} <CloseIcon size={10} color="var(--gold)" /></button>
            )}
          </div>
        )}

        {sharedLabel && (
          <p style={{
            fontFamily: 'var(--font-lora), serif',
            fontStyle: 'italic',
            fontSize: '0.92rem',
            color: 'var(--gold)',
            textAlign: 'center',
            margin: '0 0 20px',
          }}>
            Moment shared
          </p>
        )}
        {showFeedSkeleton && <FeedPostSkeletonList count={4} />}

        {listReady && feedItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
              {selectedVibe === 'ALL'
                ? 'Quiet for now.'
                : `Nothing tagged ${selectedVibe.toLowerCase()} yet.`}
            </p>
            <Link href="/compose" style={{
              padding: '10px 24px', border: '1px solid var(--border)',
              borderRadius: '50px', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
              letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none',
            }}>Share a lyric</Link>
          </div>
        )}

        <div className="margo-feed-post-list">
          {listReady && feedItems.map(item => {
            const post = item.post
            const cardProps = {
              post,
              resonated: resonated.has(post.id),
              resonateCount: postStats[post.id]?.resonateCount ?? resonateCounts[post.id] ?? post.resonates ?? 0,
              echoCount: postStats[post.id]?.echoCount ?? post.replies ?? 0,
              onResonate: toggleResonate,
              replayed: replayed.has(post.id),
              replayCount: replayBase(post.id, post.replays ?? 0),
              onReplay: (id: string) => repost(id, replayBase(id, id === post.id ? (post.replays ?? 0) : 0)),
              onQuoteReplay: (id: string, text: string) => quoteRepost(id, text, replayBase(id, id === post.id ? (post.replays ?? 0) : 0)),
              onUndoReplay: (id: string) => undoRepost(id, replayBase(id, id === post.id ? (post.replays ?? 0) : 0)),
              echoReplayed: (id: string) => replayed.has(id),
              echoReplayCount: (id: string) => replayBase(id, 0),
              replayNote: quoteFor(post.id),
              echoReplayNote: (id: string) => quoteFor(id),
              onExport: handleExport,
              isNew: newIds.has(post.id),
              isTrending: trendingIds.has(post.id),
              isTop: topIds.has(post.id),
              onSelectVibe: handleSelectVibe,
              onSelectRank: handleSelectRank,
            }
            if (item.kind === 'replay') {
              return (
                <ReplayAttribution
                  key={item.key}
                  username={item.replayerUsername}
                  displayName={item.replayerDisplayName}
                  avatarUrl={item.replayerAvatarUrl}
                  quoteText={item.quoteText}
                  cardProps={{ ...cardProps, variant: 'compact' }}
                />
              )
            }
            return (
              <PostCard
                key={item.key}
                {...cardProps}
                domId={`feed-post-${post.id}`}
                highlightShared={highlightPostId === post.id}
                openLyricBack={autoOpenLyricBackPostId === post.id}
                onLyricBackPanelChange={(open) => {
                  if (!open && autoOpenLyricBackPostId === post.id) {
                    setAutoOpenLyricBackPostId(null)
                  }
                }}
              />
            )
          })}
        </div>

        {listReady && feedItems.length > 0 && (
          <FeedOceanFooter
            hasMore={hasMoreOlder}
            loadingOlder={loadingOlder}
            onLoadOlder={() => void loadOlder()}
          />
        )}
      </main>

      <CardExportModal
        open={!!exportPost}
        onOpenChange={(o) => { if (!o) setExportPost(null) }}
        moment={exportMoment}
        enablePromote={
          !!exportPost
          && !!user?.id
          && exportPost.authorUid === user.id
          && !!identity?.isArtist
          && identity.artistStatus === 'active'
        }
      />
    </div>
    </PullToRefresh>
    </FeedPostEvictProvider>
      {feedLive && (
        <StoriesPortalDock
          onAddStory={() => {
            toast('Open a Moment and tap Add to Story in the export sheet.')
          }}
        />
      )}
    </StoryRingProvider>
  )
}
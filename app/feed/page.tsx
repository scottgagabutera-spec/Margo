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
import { FeedLiveUpdatePill } from '@/components/feed-live-update-pill'
import { useLiveUpdatePillQueue } from '@/hooks/useLiveUpdatePillQueue'
import { highlightNewItems } from '@/lib/live-updates/highlight'
import { useNewItemsBuffer } from '@/hooks/useNewItemsBuffer'
import { useContentUpdates } from '@/hooks/useContentUpdates'
import { PostCard, normalizeEmotion } from '@/components/post-card'
import { FeedPostEvictProvider } from '@/components/feed-post-evict-context'
import { ReplayAttribution } from '@/components/replay-attribution'
import { useRecentReplays } from '@/hooks/useRecentReplays'
import { usePostReplays } from '@/hooks/usePostReplays'
import { usePrimaryTab, restoreActivePrimaryScroll, scrollActiveTo } from '@/components/primary-tab-shell'
import { FeedPostSkeletonList } from '@/components/margo-skeletons'
import { useFeedMemories, useFeedMemoriesGrid } from '@/hooks/useFeedMemories'
import { MemoryFeedGridTile } from '@/components/memory-feed-grid-tile'
import { FeedMemoriesGridSkeleton } from '@/components/margo-skeletons'
import { buildFeedLyricsRows, type FeedLyricsPeopleSlot, type FeedLyricsPostRow, type FeedLyricsRow } from '@/lib/feed-lyrics-mix'
import { buildFeedPeoplePool } from '@/lib/feed-people-pool'
import { FeedMemoriesRow } from '@/components/feed-memories-row'
import { FeedEchoesSetBlock } from '@/components/feed-echoes-set-block'
import { FeedEchoesTab } from '@/components/feed-echoes-tab'
import { FeedBlockShell } from '@/components/feed-block-shell'
import type { EchoFeedBlockSnapshot } from '@/lib/echoes/types'
import { inferListeningPeriodType } from '@/lib/memory/listening-infer'
import {
  applyFeedReturnHorizontals,
  readFeedReturnSnapshot,
} from '@/lib/margo-feed-return'
import { FeedPeopleStrip } from '@/components/feed-people-strip'
import { FeedMemoryPromoCard } from '@/components/feed-memory-promo-card'
import { FeedShortsStrip } from '@/components/feed-shorts-strip'
import { localDayKey } from '@/lib/feed-memory-card'
import { feedPromoAnchorIndex } from '@/lib/feed-promo-planner'
import { feedShortsStripTilesFromClips } from '@/lib/feed-shorts-strip-tiles'
import type { LyricMoment } from '@/lib/lyric-moments-board'
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
      <Suspense fallback={null}>
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
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  const { requireAuth } = useAuthGate()
  const { user, identity } = useIdentity()
  const livePill = useLiveUpdatePillQueue(
    {
      posts: pendingCount,
      artists: artistCount,
      songs: songCount,
      memories: 0,
    },
    feedLive && !ptrBusy && !!user?.id,
  )
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
  const [acceptedFollowIds, setAcceptedFollowIds] = useState<Set<string>>(new Set())
  const [followedFromStrip, setFollowedFromStrip] = useState<Set<string>>(new Set())
  const postStatsLoadedAtRef = useRef(0)
  const resonatesLoadedAtRef = useRef(0)
  const highlightHandledRef = useRef<string | null>(null)
  const [sharedLabel, setSharedLabel] = useState(false)
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setAcceptedFollowIds(new Set())
      return
    }
    let active = true
    void supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted')
      .then(({ data, error }) => {
        if (!active || error) return
        setAcceptedFollowIds(new Set((data || []).map((r) => r.followee_id as string)))
      })
    return () => { active = false }
  }, [user?.id])

  const followingIds = useMemo(() => {
    const merged = new Set(acceptedFollowIds)
    followedFromStrip.forEach((id) => merged.add(id))
    return merged
  }, [acceptedFollowIds, followedFromStrip])

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

  const lyricPostRows = useMemo((): FeedLyricsPostRow[] => {
    return feedItems
      .filter((item) => item.kind === 'post' || item.kind === 'replay')
      .map((item) => {
        if (item.kind === 'replay') {
          return {
            kind: 'post' as const,
            key: item.key,
            post: item.post,
            sortAt: item.sortAt,
            isReplay: true,
            quoteText: item.quoteText,
            replayerUsername: item.replayerUsername,
            replayerDisplayName: item.replayerDisplayName,
            replayerAvatarUrl: item.replayerAvatarUrl,
          }
        }
        return {
          kind: 'post' as const,
          key: item.key,
          post: item.post,
          sortAt: item.sortAt,
          isReplay: false,
        }
      })
  }, [feedItems])

  const [peopleSuggestions, setPeopleSuggestions] = useState<FeedLyricsPeopleSlot[]>([])

  useEffect(() => {
    if (!user?.id || !feedLive) {
      setPeopleSuggestions([])
      return
    }
    let active = true
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, deactivated_at')
        .is('deactivated_at', null)
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(32)
      if (!active || error) return
      setPeopleSuggestions(
        (data || [])
          .filter((row) => row.username)
          .map((row) => ({
            id: row.id as string,
            username: row.username as string,
            displayName: (row.display_name as string) || (row.username as string),
            avatarUrl: (row.avatar_url as string) || null,
          })),
      )
    })()
    return () => { active = false }
  }, [user?.id, feedLive])

  const peoplePool = useMemo((): FeedLyricsPeopleSlot[] => {
    const fromPosts: FeedLyricsPeopleSlot[] = []
    const myId = user?.id
    for (const p of posts) {
      const id = p.authorUid
      if (!id || !p.username) continue
      fromPosts.push({
        id,
        username: p.username,
        displayName: p.authorDisplayName || p.username,
        avatarUrl: p.authorAvatarUrl || null,
      })
    }
    return buildFeedPeoplePool({
      fromPosts,
      suggestions: peopleSuggestions,
      myId,
      followingIds,
    })
  }, [posts, user?.id, followingIds, peopleSuggestions])

  const { memories: feedMemories } = useFeedMemories(feedLive && feedContentTab === 'lyrics')
  const {
    memories: feedGridMemories,
    loading: feedGridLoading,
    loadingMore: feedGridLoadingMore,
    hasMore: feedGridHasMore,
    loadMore: loadMoreFeedMemories,
  } = useFeedMemoriesGrid(feedLive && feedContentTab === 'memories')
  const feedMemoriesSentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (feedContentTab !== 'memories' || !feedLive) return
    const el = feedMemoriesSentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMoreFeedMemories()
      },
      { rootMargin: '320px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [feedContentTab, feedLive, loadMoreFeedMemories, feedGridMemories.length])

  const [ownMemoryCount, setOwnMemoryCount] = useState<number | null>(null)
  const [echoesBlock, setEchoesBlock] = useState<EchoFeedBlockSnapshot | null>(null)

  useEffect(() => {
    if (!feedLive) return
    let active = true
    void fetch('/api/echoes/feed-block')
      .then((r) => r.json())
      .then((data: { block?: EchoFeedBlockSnapshot | null }) => {
        if (active) setEchoesBlock(data.block ?? null)
      })
      .catch(() => {
        if (active) setEchoesBlock(null)
      })
    return () => { active = false }
  }, [feedLive])

  useEffect(() => {
    if (!user?.id) {
      setOwnMemoryCount(null)
      return
    }
    let active = true
    setOwnMemoryCount(null)
    void supabase
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('owner_profile_id', user.id)
      .is('content_removed_at', null)
      .then((countRes) => {
        if (!active) return
        setOwnMemoryCount(countRes.error ? 0 : (countRes.count ?? 0))
      })
    return () => { active = false }
  }, [user?.id, supabase])

  const promoAnchor = useMemo(
    () => feedPromoAnchorIndex(user?.id ?? null, localDayKey(), !!user?.id),
    [user?.id],
  )

  const shortsStripTiles = useMemo(
    () => feedShortsStripTilesFromClips(resolvedShortsClips as LyricMoment[]),
    [resolvedShortsClips],
  )

  const feedGridMemoriesFiltered = useMemo(() => {
    if (searchParams.get('filter') !== 'listening') return feedGridMemories
    return feedGridMemories.filter((m) =>
      inferListeningPeriodType({
        dateGranularity: m.dateGranularity,
        dateStart: m.dateStart,
        dateEnd: m.dateEnd,
        songCount: m.songCount,
        photoCount: m.photos.length,
      }) === 'week',
    )
  }, [feedGridMemories, searchParams])

  const shortsAtParam = searchParams.get('shortsAt')
  const shortsInitialIndex = (() => {
    const n = Number(shortsAtParam)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
  })()

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

  const handleFeedContentTab = (tab: 'lyrics' | 'memories' | 'shorts' | 'echoes') => {
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
  const lyricsMixGateReady = listReady && (!user?.id || ownMemoryCount !== null)
  const lyricsMixReady = lyricsMixGateReady
  const showFeedSkeleton =
    (loading && posts.length === 0 && !seeded) || (listReady && !!user?.id && ownMemoryCount === null)

  const mixedLyricRows = useMemo((): FeedLyricsRow[] => {
    if (feedContentTab !== 'lyrics' || !lyricsMixGateReady) return []
    return buildFeedLyricsRows({
      lyricPosts: lyricPostRows,
      memories: feedMemories,
      peoplePool,
      signedIn: !!user?.id,
      promoAnchor,
      shortsStripAvailable: resolvedShortsMeetsMinimum && shortsStripTiles.length > 0,
      echoesBlock,
    })
  }, [
    feedContentTab,
    lyricPostRows,
    feedMemories,
    peoplePool,
    promoAnchor,
    lyricsMixGateReady,
    user?.id,
    resolvedShortsMeetsMinimum,
    shortsStripTiles.length,
    echoesBlock,
  ])

  const feedTabRestoredRef = useRef(false)
  useLayoutEffect(() => {
    if (!feedLive || feedTabRestoredRef.current) return
    const snap = readFeedReturnSnapshot()
    if (!snap) return
    feedTabRestoredRef.current = true
    if (snap.tab !== feedContentTab) {
      const params = applyFeedContentTab(new URLSearchParams(searchParams.toString()), snap.tab)
      if (snap.shortsAt != null && snap.tab === 'shorts') {
        params.set('shortsAt', String(snap.shortsAt))
      }
      const qs = params.toString()
      router.replace(qs ? `/feed?${qs}` : '/feed', { scroll: false })
    } else if (snap.shortsAt != null && feedContentTab === 'shorts' && !shortsAtParam) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('shortsAt', String(snap.shortsAt))
      router.replace(`/feed?${params.toString()}`, { scroll: false })
    }
  }, [feedLive, feedContentTab, router, searchParams, shortsAtParam])

  useLayoutEffect(() => {
    if (!feedLive || !listReady || highlightParam) return
    const snap = readFeedReturnSnapshot()
    if (!snap) return
    applyFeedReturnHorizontals(snap)
  }, [feedLive, listReady, mixedLyricRows.length, highlightParam, feedContentTab])
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
      enabled={feedContentTab === 'lyrics'}
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
      {!ptrBusy && feedLive && livePill.active ? (
        <FeedLiveUpdatePill
          kind={livePill.active.kind}
          count={livePill.active.count}
          reducedMotion={reducedMotion}
          onDismiss={livePill.dismissActive}
          onActivate={() => {
            const kind = livePill.active?.kind
            if (kind === 'posts') {
              flushPending()
              scrollActiveTo(0)
              window.requestAnimationFrame(() => highlightNewItems('[id^="feed-post-"]', 3))
            } else if (kind === 'songs') {
              openSongs()
            } else if (kind === 'artists') {
              openArtists()
            } else if (kind === 'memories') {
              handleFeedContentTab('memories')
              window.requestAnimationFrame(() => highlightNewItems('[data-margo-memory-tile]', 3))
            }
            livePill.acknowledge()
          }}
        />
      ) : null}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-128px', left: '-128px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.04)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-160px', right: '-160px', width: '384px', height: '384px', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(80px)' }} />
      </div>

      {feedContentTab === 'memories' && (
        <main
          className="margo-feed-column margo-feed-column--memories-grid"
          style={{ position: 'relative', zIndex: 5, padding: '12px 14px var(--margo-page-padding-bottom)' }}
        >
          {searchParams.get('filter') === 'listening' ? (
            <div className="margo-feed-memories-filter" style={{ marginBottom: 12 }}>
              <span className="margo-feed-memories-filter__chip">Listening</span>
            </div>
          ) : null}
          {feedGridLoading && feedGridMemories.length === 0 ? (
            <FeedMemoriesGridSkeleton count={6} />
          ) : feedGridMemoriesFiltered.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', padding: '48px 0' }}>
              No memories in your feed yet.
            </p>
          ) : (
            <>
              <div className="margo-feed-memories-grid">
                {feedGridMemoriesFiltered.map((m) => (
                  <MemoryFeedGridTile key={m.id} memory={m} />
                ))}
              </div>
              {feedGridLoadingMore ? (
                <div className="margo-feed-memories-grid margo-feed-memories-grid--more" aria-hidden>
                  <FeedMemoriesGridSkeleton count={3} />
                </div>
              ) : null}
              {feedGridHasMore ? (
                <div ref={feedMemoriesSentinelRef} className="margo-feed-memories-grid-sentinel" aria-hidden />
              ) : null}
            </>
          )}
        </main>
      )}

      {feedContentTab === 'echoes' && <FeedEchoesTab />}

      {feedContentTab === 'shorts' && (
        <FeedShortsPager
          clips={resolvedShortsClips}
          loading={resolvedShortsLoading}
          meetsMinimum={resolvedShortsMeetsMinimum}
          signedIn={!!user?.id}
          onRequireSignIn={() => requireAuth({ returnTo: '/feed?tab=shorts' })}
          vibeFilterActive={vibeFilterActive}
          tabActive={feedLive && feedContentTab === 'shorts'}
          initialIndex={shortsInitialIndex}
        />
      )}

      <main
        className={`margo-feed-column${feedContentTab !== 'lyrics' ? ' margo-feed-lyrics-pane--hidden' : ''}`}
        style={{ position: 'relative', zIndex: 5, padding: '16px 16px var(--margo-page-padding-bottom)' }}
        aria-hidden={feedContentTab !== 'lyrics'}
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

        {lyricsMixReady && lyricPostRows.length === 0 && !mixedLyricRows.some((r) => r.kind !== 'post') && (
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
          {lyricsMixReady && mixedLyricRows.map((item) => {
            if (item.kind === 'memories-row') {
              return (
                <FeedBlockShell key={item.key} blockName="memories-row" planKey={item.planKey} className="margo-feed-block-shell">
                  <FeedMemoriesRow memories={item.memories} hasMore={item.hasMore} />
                </FeedBlockShell>
              )
            }
            if (item.kind === 'echoes-set') {
              return (
                <FeedBlockShell key={item.key} blockName="echoes" planKey={item.planKey} className="margo-feed-block-shell">
                  <FeedEchoesSetBlock block={item.block} signedIn={!!user?.id} />
                </FeedBlockShell>
              )
            }
            if (item.kind === 'people') {
              return (
                <FeedBlockShell key={item.key} blockName="people" planKey={item.planKey} className="margo-feed-block-shell">
                  <FeedPeopleStrip
                    people={item.people}
                    followingIds={followingIds}
                    onFollowed={(id) => setFollowedFromStrip((prev) => new Set(prev).add(id))}
                  />
                </FeedBlockShell>
              )
            }
            if (item.kind === 'memory-promo') {
              return (
                <FeedBlockShell key={item.key} blockName={`memory-promo-${item.promoKind}`} planKey={item.planKey} className="margo-feed-block-shell">
                  <FeedMemoryPromoCard promoKind={item.promoKind} />
                </FeedBlockShell>
              )
            }
            if (item.kind === 'shorts-strip') {
              return (
                <FeedBlockShell key={item.key} blockName="shorts-strip" planKey={item.planKey} className="margo-feed-block-shell">
                  <FeedShortsStrip tiles={shortsStripTiles} />
                </FeedBlockShell>
              )
            }
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
            if (item.isReplay) {
              return (
                <ReplayAttribution
                  key={item.key}
                  username={item.replayerUsername ?? null}
                  displayName={item.replayerDisplayName ?? null}
                  avatarUrl={item.replayerAvatarUrl ?? null}
                  quoteText={item.quoteText ?? null}
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

        {listReady && lyricPostRows.length > 0 && (
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
        returnFocusPostId={exportPost?.id ?? null}
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
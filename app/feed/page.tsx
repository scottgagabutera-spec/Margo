'use client'
import { toast } from 'sonner'
import { CloseIcon } from '@/components/icons'
import { useState, useEffect, useMemo, useRef } from 'react'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/hooks/usePosts'
import { CardExportModal } from '@/components/card-export-modal'
import { resolveMargoMomentFromPost } from '@/lib/moment'
import { resolveMomentLines } from '@/lib/post-lines'
import { isNotificationAllowed } from '@/lib/notification-prefs'
import Link from 'next/link'
import { PendingNavLink } from '@/components/pending-nav-link'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { createClient } from '@/lib/supabase/client'
import { useIdentity } from '@/hooks/useIdentity'
import { useNotifications } from '@/hooks/useNotifications'
import { useMessaging } from '@/hooks/useMessaging'
import { MargoSearchInput } from '@/components/margo-search-input'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { FeedNewMomentsPill } from '@/components/feed-new-moments-pill'
import { ContentUpdatesBar } from '@/components/content-updates-bar'
import { useNewItemsBuffer } from '@/hooks/useNewItemsBuffer'
import { useContentUpdates } from '@/hooks/useContentUpdates'
import { searchProfiles, type ProfileSearchHit } from '@/lib/search-profiles'
import { ArtistBadge } from '@/components/artist-badge'
import { PostCard, normalizeEmotion } from '@/components/post-card'
import { ReplayAttribution } from '@/components/replay-attribution'
import { useRecentReplays } from '@/hooks/useRecentReplays'
import { usePrimaryTab } from '@/components/primary-tab-shell'
import { FeedPostSkeletonList } from '@/components/margo-skeletons'

const supabase = createClient()

// Soft-reload Feed-local Realtime payloads after pausing a hidden pane.
const FEED_STALE_MS = 60_000

// ── Earned-tag thresholds (feed ranking only) ─────────────────────────
const NEW_WINDOW_HOURS = 24
const RANK_BADGE_COUNT = 5
const MIN_TRENDING_ENGAGE = 4
const MIN_TRENDING_AGE_HOURS = 3

export default function FeedPage() {
  const { isTabActive } = usePrimaryTab()
  const feedLive = isTabActive('feed')
  const { posts: livePosts, loading, reload } = usePosts({ enabled: feedLive })
  const {
    items: posts,
    seeded,
    pendingCount,
    flushPending,
    applyImmediate,
  } = useNewItemsBuffer(livePosts, { settleEmpty: !loading })
  const { songCount, artistCount, openSongs, openArtists } = useContentUpdates({
    enabled: feedLive,
  })
  const { replays: recentReplays } = useRecentReplays(80, { enabled: feedLive })
  const [ptrBusy, setPtrBusy] = useState(false)
  const { requireAuth } = useAuthGate()
  const { user } = useIdentity()
  const { refetch: refetchNotifications } = useNotifications()
  const { refetch: refetchMessages } = useMessaging()
  const [selectedVibe, setSelectedVibe] = useState('ALL')
  const [selectedSort, setSelectedSort] = useState('NEW')
  const [searchQuery, setSearchQuery] = useState('')
  const [people, setPeople] = useState<ProfileSearchHit[]>([])
  const [resonated, setResonated] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoResonated')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [resonateCounts, setResonateCounts] = useState<Record<string, number>>({})
  const [replayed, setReplayed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem('margoReplayed')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  const [replayCounts, setReplayCounts] = useState<Record<string, number>>({})
  const [postStats, setPostStats] = useState<Record<string, { views?: number; resonateCount?: number; echoCount?: number; replayCount?: number }>>({})
  const [exportPost, setExportPost] = useState<Post | null>(null)
  const postStatsLoadedAtRef = useRef(0)
  const resonatesLoadedAtRef = useRef(0)
  const replaysLoadedAtRef = useRef(0)

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
  }, [feedLive])

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

  // Load user's Replays — replayer_id must be auth profile uuid (RLS: auth.uid() = replayer_id).
  useEffect(() => {
    if (!feedLive || !user?.id) return
    const myId = user.id
    let cancelled = false
    async function loadMyReplays() {
      const { data, error } = await supabase
        .from('post_replays')
        .select('post_id')
        .eq('replayer_id', myId)
      if (cancelled) return
      if (error) { console.error('Failed to load replays:', error); return }
      const mine = new Set((data || []).map(r => r.post_id))
      setReplayed(mine)
      try { localStorage.setItem('margoReplayed', JSON.stringify([...mine])) } catch {}
      replaysLoadedAtRef.current = Date.now()
    }
    const neverLoaded = replaysLoadedAtRef.current === 0
    const stale = Date.now() - replaysLoadedAtRef.current > FEED_STALE_MS
    if (neverLoaded || stale) loadMyReplays()

    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      const next = supabase.channel(`feed-my-replays:${crypto.randomUUID()}`)
      next.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_replays', filter: `replayer_id=eq.${myId}` },
        () => { if (!cancelled) loadMyReplays() }
      )
      next.subscribe()
      channel = next
    } catch (err) {
      console.error('feed-my-replays realtime failed', err)
    }

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [feedLive, user?.id])

  // Feed rank (client-side on the currently loaded list, not a DB rank):
  // New badge = created within 24h. Trending = top 5 by engage/(ageHrs+2)^1.4.
  // Top = top 5 by lifetime engage. engage = views + 4*resonates + 5*echoes.
  // Replays and song plays do not affect Feed badges.
  const getEngagement = (post: Post) => {
    const s = postStats[post.id] || {}
    return (s.views || 0) + ((s.resonateCount || 0) * 4) + ((s.echoCount || 0) * 5)
  }

  const getAge = (post: Post) => {
    if (!post.timestamp) return 999
    return (Date.now() - post.timestamp) / 3600000
  }

  // Refactored to take the sort mode as an argument (was reading
  // selectedSort from closure) so we can score every post under every
  // mode once, up front, to compute which posts EARN a badge — instead
  // of only ever knowing scores under whichever single sort was active.
  const getScoreFor = (post: Post, sort: string) => {
    const age = getAge(post)
    const engage = getEngagement(post)
    if (sort === 'NEW') return Math.exp(-age / 18) * 1000 + engage * 0.05
    if (sort === 'TRENDING') return engage / Math.pow(age + 2, 1.4)
    if (sort === 'TOP') return engage
    return 0
  }

  // Earned-badge sets — computed once from the full unfiltered post
  // list, independent of whatever filter is currently active. A badge
  // is never permanent chrome; it only exists on posts that actually
  // rank in the top N right now.
  const { newIds, trendingIds, topIds } = useMemo(() => {
    const newIds = new Set(posts.filter(p => getAge(p) < NEW_WINDOW_HOURS).map(p => p.id))
    const trendingIds = new Set(
      [...posts]
        .filter(p => !newIds.has(p.id))
        .filter(p => getAge(p) >= MIN_TRENDING_AGE_HOURS)
        .filter(p => getEngagement(p) >= MIN_TRENDING_ENGAGE)
        .sort((a, b) => getScoreFor(b, 'TRENDING') - getScoreFor(a, 'TRENDING'))
        .slice(0, RANK_BADGE_COUNT)
        .map(p => p.id)
    )
    const topIds = new Set(
      [...posts]
        .filter(p => getEngagement(p) > 0)
        .sort((a, b) => getScoreFor(b, 'TOP') - getScoreFor(a, 'TOP'))
        .slice(0, RANK_BADGE_COUNT)
        .map(p => p.id)
    )
    return { newIds, trendingIds, topIds }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, postStats])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) { setPeople([]); return }
    const t = setTimeout(async () => {
      const hits = await searchProfiles(supabase, q)
      setPeople(hits)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const matchesFeedFilters = (p: Post) => {
    const norm = normalizeEmotion(p.emotion || '')
    const matchesVibe = selectedVibe === 'ALL' || norm === selectedVibe
    if (!searchQuery.trim()) return matchesVibe
    const q = searchQuery.toLowerCase()
    const momentHaystack = resolveMomentLines(p).map((l) => l.text).join(' ').toLowerCase()
    return matchesVibe && (
      momentHaystack.includes(q) ||
      (p.knowledge?.song || '').toLowerCase().includes(q) ||
      (p.knowledge?.artist || '').toLowerCase().includes(q) ||
      (p.emotion || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.authorDisplayName || '').toLowerCase().includes(q)
    )
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

    // Interleave recent Replays from anyone (global discovery). Originals
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
      merged.sort((a, b) => getScoreFor(b.post, selectedSort) - getScoreFor(a.post, selectedSort))
    }
    return merged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, recentReplays, selectedVibe, selectedSort, searchQuery, postStats])

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

  const toggleReplay = async (postId: string) => {
    if (!requireAuth()) return
    if (!user?.id) return
    const myId = user.id
    const already = replayed.has(postId)

    if (already) {
      setReplayed(prev => {
        const next = new Set(prev)
        next.delete(postId)
        try { localStorage.setItem('margoReplayed', JSON.stringify([...next])) } catch {}
        return next
      })
      setReplayCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }))
      try {
        const { error } = await supabase
          .from('post_replays')
          .delete()
          .eq('post_id', postId)
          .eq('replayer_id', myId)
        if (error) throw error
        toast.success('Replay removed')
      } catch (err) {
        console.error('Failed to un-replay:', err)
        setReplayed(prev => {
          const next = new Set(prev)
          next.add(postId)
          try { localStorage.setItem('margoReplayed', JSON.stringify([...next])) } catch {}
          return next
        })
        setReplayCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + 1) }))
      }
      return
    }

    setReplayed(prev => {
      const next = new Set(prev)
      next.add(postId)
      try { localStorage.setItem('margoReplayed', JSON.stringify([...next])) } catch {}
      return next
    })
    setReplayCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + 1) }))

    try {
      const { error } = await supabase.from('post_replays').insert({
        post_id: postId,
        replayer_id: myId,
        quote_text: null,
      })
      if (error) throw error
      toast.success('Replayed')
    } catch (err) {
      console.error('Failed to replay:', err)
      setReplayed(prev => {
        const next = new Set(prev)
        next.delete(postId)
        try { localStorage.setItem('margoReplayed', JSON.stringify([...next])) } catch {}
        return next
      })
      setReplayCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }))
    }
  }

  const quoteReplay = async (postId: string, quoteText: string) => {
    if (!requireAuth()) return
    if (!user?.id) return
    const text = quoteText.trim()
    if (!text) return
    const myId = user.id
    const already = replayed.has(postId)

    if (!already) {
      setReplayed(prev => {
        const next = new Set(prev)
        next.add(postId)
        try { localStorage.setItem('margoReplayed', JSON.stringify([...next])) } catch {}
        return next
      })
      setReplayCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + 1) }))
    }

    try {
      if (already) {
        const { error } = await supabase
          .from('post_replays')
          .update({ quote_text: text })
          .eq('post_id', postId)
          .eq('replayer_id', myId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_replays').insert({
          post_id: postId,
          replayer_id: myId,
          quote_text: text,
        })
        if (error) throw error
      }
      toast.success('Replayed')
    } catch (err) {
      console.error('Failed to quote-replay:', err)
      if (!already) {
        setReplayed(prev => {
          const next = new Set(prev)
          next.delete(postId)
          try { localStorage.setItem('margoReplayed', JSON.stringify([...next])) } catch {}
          return next
        })
        setReplayCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }))
      }
    }
  }

  const handleExport = (post: Post) => {
    if (!requireAuth()) return
    setExportPost(post)
  }

  const handleSelectVibe = (vibe: string) => {
    setSelectedVibe(prev => (prev === vibe ? 'ALL' : vibe))
  }

  const handleSelectRank = (rank: 'NEW' | 'TRENDING' | 'TOP') => {
    setSelectedSort(prev => (prev === rank ? 'NEW' : rank))
  }

  const listReady = seeded && !loading
  const hasActiveFilter = selectedVibe !== 'ALL' || selectedSort !== 'NEW'

  return (
    <PullToRefresh
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', paddingTop: 'var(--nav-height, 72px)' }}>
      {!ptrBusy && feedLive && pendingCount > 0 && (
        <div style={{
          position: 'sticky',
          top: 'calc(var(--nav-height, 72px) + 88px)',
          zIndex: 25,
          maxWidth: '720px',
          margin: '0 auto',
          padding: '0 20px 8px',
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'center' }}>
            <FeedNewMomentsPill count={pendingCount} onReveal={flushPending} variant="inline" />
          </div>
        </div>
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

      {/* Sticky header — search only now. The old permanent vibe-pill row
          and New/Trending/Top tab row are gone; those filters are now
          triggered from tags that live ON the posts themselves (see
          EarnedTag and the vibe label button in PostCard), and only
          show up here as a dismissible chip once one is active.

          top: var(--nav-height) — was a hardcoded 56px guess, which
          undershot the real fixed-nav height and let this sticky bar
          (and by extension the feed content below it) drift under the
          nav. Now reads the same measured value MargoNav publishes,
          so this can't drift out of sync again. */}
      <div style={{ position: 'sticky', top: 'var(--nav-height, 72px)', zIndex: 30, background: 'var(--bg)', padding: 'clamp(20px, 5vw, 56px) 20px 0' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ paddingBottom: hasActiveFilter ? '10px' : '20px' }}>
            <MargoSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search lyrics, songs, artists, people…"
            />
          </div>

          {hasActiveFilter && (
            <div style={{ display: 'flex', gap: '6px', paddingBottom: '16px' }}>
              {selectedVibe !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedVibe('ALL')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '50px',
                    background: 'var(--gold)', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--bg)',
                  }}
                >Filtering: {selectedVibe} <CloseIcon size={10} color="var(--bg)" /></button>
              )}
              {selectedSort !== 'NEW' && (
                <button
                  type="button"
                  onClick={() => setSelectedSort('NEW')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', borderRadius: '50px',
                    background: 'transparent', border: '1px solid var(--gold-border)', cursor: 'pointer',
                    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)',
                  }}
                >{selectedSort} <CloseIcon size={10} color="var(--gold)" /></button>
              )}
            </div>
          )}
        </div>
      </div>

      <main style={{ position: 'relative', zIndex: 5, maxWidth: '720px', margin: '0 auto', padding: '32px 24px var(--margo-page-padding-bottom)' }}>
        {!listReady && <FeedPostSkeletonList count={4} />}

        {listReady && feedItems.length === 0 && !(searchQuery.trim() && people.length > 0) && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
              {searchQuery ? `No lyrics found for "${searchQuery}"` : `No ${selectedVibe === 'ALL' ? '' : selectedVibe.toLowerCase()} lyrics yet`}
            </p>
            <Link href="/compose" style={{
              padding: '10px 24px', border: '1px solid var(--border)',
              borderRadius: '50px', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem',
              letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none',
            }}>Be the first</Link>
          </div>
        )}

        {searchQuery.trim() && people.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '12px' }}>People</p>
            {people.map(p => (
              <PendingNavLink key={p.id} href={`/profile/${p.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', textDecoration: 'none', borderBottom: '1px solid var(--border)', minHeight: 'var(--margo-touch-min)' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: p.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', fontWeight: 700, color: 'var(--bg)' }}>
                      {(p.displayName || p.username || '??').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--text)', fontFamily: 'var(--font-lora), serif', fontSize: '0.9rem', margin: 0 }}>{p.displayName}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>@{p.username}</p>
                </div>
                {p.isArtist && <ArtistBadge isArtist artistStatus={p.artistStatus} size={12} />}
              </PendingNavLink>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {listReady && feedItems.map(item => {
            const post = item.post
            const cardProps = {
              post,
              resonated: resonated.has(post.id),
              resonateCount: postStats[post.id]?.resonateCount ?? resonateCounts[post.id] ?? post.resonates ?? 0,
              echoCount: postStats[post.id]?.echoCount ?? 0,
              onResonate: toggleResonate,
              replayed: replayed.has(post.id),
              replayCount: postStats[post.id]?.replayCount ?? replayCounts[post.id] ?? post.replays ?? 0,
              onReplay: toggleReplay,
              onQuoteReplay: quoteReplay,
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
            return <PostCard key={item.key} {...cardProps} />
          })}
        </div>

        {listReady && feedItems.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <div style={{ height: '1px', width: '96px', background: 'linear-gradient(to right, transparent, var(--border), transparent)', margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text-muted)' }}>you&apos;ve felt them all</p>
          </div>
        )}
      </main>

      <CardExportModal
        open={!!exportPost}
        onOpenChange={(o) => { if (!o) setExportPost(null) }}
        moment={exportPost ? resolveMargoMomentFromPost(exportPost) : null}
      />
    </div>
    </PullToRefresh>
  )
}
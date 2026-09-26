'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useVisibleAuthorIds } from '@/hooks/useVisibleAuthorIds'
import {
  PRIMARY_TAB_STALE_MS,
  peekFeedPostsCache,
  warmFeedPosts,
  fetchFeedPostsOlder,
} from '@/lib/primary-tab-prefetch'
import type { PostLine } from '@/lib/post-lines'
import type { AtmosphereId } from '@/lib/atmosphere'

const supabase = createClient()

export { PRIMARY_TAB_STALE_MS }
export type { PostLine }

export interface Post {
  id: string
  text?: string
  emotion?: string
  status?: string
  knowledge?: { song?: string; artist?: string; artwork?: string | null }
  youtubeMeta?: { videoId?: string | null; title?: string | null; thumbnail?: string | null; thumbnailSm?: string | null; channel?: string | null; youtubeUrl?: string | null; embedUrl?: string | null } | null
  username?: string | null
  authorUid?: string | null
  authorAvatarUrl?: string | null
  authorDisplayName?: string | null
  timestamp?: number
  resonates?: number
  replies?: number
  replays?: number
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  isAiGenerated?: boolean
  /** Live join from songs.atmosphere — never stored on the post. */
  atmosphere?: AtmosphereId
  /**
   * Multi-line moment segments when joined. Empty/undefined → render from
   * top-level text/song/snippet (position-0 mirror).
   */
  lines?: PostLine[]
  /** Immediate parent Lyric Back / Moment. Null on top-level feed posts. */
  parentPostId?: string | null
}

export type UsePostsOptions = {
  /**
   * When false (inactive keepalive pane), tear down Realtime and skip
   * event-driven refetches but keep the last React state for instant show.
   * Default true for non-shell callers (music, etc.).
   */
  enabled?: boolean
}

export function usePosts(options: UsePostsOptions = {}) {
  const enabled = options.enabled ?? true
  const { loading: authLoading } = useAuthGate()
  const cached = peekFeedPostsCache()
  const [posts, setPosts] = useState<Post[]>(cached?.data ?? [])
  const [loading, setLoading] = useState(!cached)
  const lastLoadedAtRef = useRef(cached?.loadedAt ?? 0)
  const prevAuthLoadingRef = useRef<boolean | null>(null)

  const load = useCallback(async (force = false): Promise<Post[]> => {
    const mapped = await warmFeedPosts({ force })
    setPosts(prev => {
      if (mapped.length === 0 && prev.length > 0) return prev
      return mapped
    })
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
      void load(stale && !neverLoaded)
    }

    try {
      const topic = `posts-feed:${crypto.randomUUID()}`
      const next = supabase.channel(topic)
      next.on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        if (!active) return
        void load(true)
      })
      next.subscribe()
      channel = next
    } catch (err) {
      console.error('usePosts: realtime subscribe failed', err)
    }

    return () => {
      active = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled, load])

  // After OAuth (and cold /feed loads), the first fetch can finish before
  // /api/auth/me hydrates the in-memory bearer. visibilityReady stays false
  // until authLoading clears — refetch once when hydration finishes so Feed
  // populates without a tab switch. warmFeedPosts dedupes concurrent loads.
  useEffect(() => {
    if (!enabled) return

    const prev = prevAuthLoadingRef.current
    prevAuthLoadingRef.current = authLoading

    if (prev === true && authLoading === false) {
      void load(true)
    }
  }, [enabled, authLoading, load])

  const authorUids = useMemo(() => posts.map(p => p.authorUid), [posts])
  const { ids: visibleAuthorIds, ready: visibilityReady } = useVisibleAuthorIds(authorUids)

  const lastVisibleRef = useRef<Post[]>([])

  const visiblePosts = useMemo(() => {
    if (!visibilityReady) {
      return lastVisibleRef.current.length > 0 ? lastVisibleRef.current : []
    }
    const next = posts.filter(p => !p.authorUid || visibleAuthorIds.has(p.authorUid))
    lastVisibleRef.current = next
    return next
  }, [posts, visibleAuthorIds, visibilityReady])

  const waitingOnPrivacy = posts.length > 0 && !visibilityReady && lastVisibleRef.current.length === 0

  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)

  useEffect(() => {
    if (posts.length > 0 && posts.length < 200) {
      setHasMoreOlder(false)
    }
  }, [posts.length])

  const loadOlder = useCallback(async () => {
    const source = posts.length > 0 ? posts : visiblePosts
    const oldest = source[source.length - 1]?.timestamp
    if (!oldest || loadingOlder || !hasMoreOlder) return
    setLoadingOlder(true)
    try {
      const iso = new Date(oldest).toISOString()
      const rows = await fetchFeedPostsOlder(iso)
      if (rows.length < 40) setHasMoreOlder(false)
      if (rows.length === 0) return
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const merged = [...prev]
        for (const row of rows) {
          if (!seen.has(row.id)) merged.push(row)
        }
        return merged
      })
    } finally {
      setLoadingOlder(false)
    }
  }, [posts, visiblePosts, loadingOlder, hasMoreOlder])

  return {
    posts: visiblePosts,
    loading: loading || waitingOnPrivacy,
    reload: () => load(true),
    loadOlder,
    loadingOlder,
    hasMoreOlder,
  }
}

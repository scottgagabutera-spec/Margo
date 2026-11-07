'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MemoryPublic } from '@/lib/memory/types'

const FEED_MEMORIES_STALE_MS = 90_000
const LYRICS_MIX_LIMIT = 24
const GRID_PAGE_SIZE = 12

type FeedMemoriesResponse = {
  memories?: MemoryPublic[]
  nextCursor?: string | null
  hasMore?: boolean
}

/** First page for Lyrics tab interleave (no infinite scroll). */
export function useFeedMemories(enabled: boolean) {
  const [memories, setMemories] = useState<MemoryPublic[]>([])
  const [loading, setLoading] = useState(false)
  const loadedAtRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const stale = Date.now() - loadedAtRef.current > FEED_MEMORIES_STALE_MS
    if (loadedAtRef.current > 0 && !stale) return

    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/memories/feed?limit=${LYRICS_MIX_LIMIT}`)
        if (!res.ok) return
        const data = (await res.json()) as FeedMemoriesResponse
        if (cancelled) return
        setMemories(data.memories || [])
        loadedAtRef.current = Date.now()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [enabled])

  return { memories, loading }
}

/** Paginated grid for Feed → Memories tab. */
export function useFeedMemoriesGrid(enabled: boolean) {
  const [memories, setMemories] = useState<MemoryPublic[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cursorRef = useRef<string | null>(null)
  const loadedAtRef = useRef(0)

  const fetchPage = useCallback(async (mode: 'reset' | 'more') => {
    const params = new URLSearchParams({ limit: String(GRID_PAGE_SIZE) })
    if (mode === 'more' && cursorRef.current) params.set('cursor', cursorRef.current)

    const res = await fetch(`/api/memories/feed?${params.toString()}`)
    if (!res.ok) return
    const data = (await res.json()) as FeedMemoriesResponse
    const page = data.memories || []
    cursorRef.current = data.nextCursor ?? null
    setHasMore(!!data.hasMore)
    setMemories((prev) => (mode === 'more' ? [...prev, ...page] : page))
    loadedAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const stale = Date.now() - loadedAtRef.current > FEED_MEMORIES_STALE_MS
    if (loadedAtRef.current > 0 && !stale) return

    void (async () => {
      setLoading(true)
      cursorRef.current = null
      try {
        await fetchPage('reset')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [enabled, fetchPage])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !cursorRef.current) return
    setLoadingMore(true)
    try {
      await fetchPage('more')
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loading, loadingMore])

  return { memories, loading, loadingMore, hasMore, loadMore }
}

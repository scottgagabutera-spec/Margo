'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PRIMARY_TAB_STALE_MS,
  peekMomentsCache,
  warmLyricMoments,
  type LyricMomentRow,
} from '@/lib/primary-tab-prefetch'

export type { LyricMomentRow }

export type UseLyricMomentsOptions = {
  /**
   * When false (inactive keepalive pane), skip fetch/soft-reload but keep
   * last React state. Default true for non-shell callers.
   */
  enabled?: boolean
}

/**
 * Discover phase-2: vibed lyric lines only (not the full catalog embed).
 * Pair with light `useSongs` for chrome; full lines still via `useSong(id)`.
 */
export function useLyricMoments(options: UseLyricMomentsOptions = {}) {
  const enabled = options.enabled ?? true
  const cached = peekMomentsCache()
  const [moments, setMoments] = useState<LyricMomentRow[]>(cached?.data ?? [])
  const [loading, setLoading] = useState(!cached?.data)
  const lastLoadedAtRef = useRef(cached?.loadedAt ?? 0)

  const load = useCallback(async (force = false) => {
    const rows = await warmLyricMoments({ force })
    setMoments(rows)
    setLoading(false)
    lastLoadedAtRef.current = Date.now()
    return rows
  }, [])

  useEffect(() => {
    if (!enabled) return

    const neverLoaded = lastLoadedAtRef.current === 0
    const stale = Date.now() - lastLoadedAtRef.current > PRIMARY_TAB_STALE_MS
    if (neverLoaded || stale) {
      void load(stale && !neverLoaded)
    }
  }, [enabled, load])

  return { moments, loading, refetch: () => load(true) }
}

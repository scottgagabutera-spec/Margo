'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PRIMARY_TAB_STALE_MS,
  peekMomentsCache,
  peekMomentsSongAtoms,
  warmLyricMoments,
  type LyricMomentRow,
} from '@/lib/primary-tab-prefetch'
import type { CatalogLyricAtom } from '@/lib/catalog-lyric-unit'

export type { LyricMomentRow }

export type UseLyricMomentsOptions = {
  /**
   * When false (inactive keepalive pane), skip fetch/soft-reload but keep
   * last React state. Default true for non-shell callers.
   */
  enabled?: boolean
}

/**
 * Discover phase-2: vibed lyric centers + full song line atoms for catalog-unit
 * window expansion. Pair with light `useSongs` for chrome.
 */
export function useLyricMoments(options: UseLyricMomentsOptions = {}) {
  const enabled = options.enabled ?? true
  const cached = peekMomentsCache()
  const cachedAtoms = peekMomentsSongAtoms()
  const [moments, setMoments] = useState<LyricMomentRow[]>(cached?.data ?? [])
  const [songAtomsBySongId, setSongAtomsBySongId] = useState<Record<string, CatalogLyricAtom[]>>(
    cachedAtoms ?? {},
  )
  const [loading, setLoading] = useState(!cached?.data)
  const lastLoadedAtRef = useRef(cached?.loadedAt ?? 0)

  const load = useCallback(async (force = false) => {
    const rows = await warmLyricMoments({ force })
    setMoments(rows)
    setSongAtomsBySongId(peekMomentsSongAtoms() ?? {})
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

  return { moments, songAtomsBySongId, loading, refetch: () => load(true) }
}

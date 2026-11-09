'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PRIMARY_TAB_STALE_MS,
  loadMoreLyricMomentsDiscoverHome,
  peekCuratedMomentsBySong,
  peekMomentsCache,
  peekMomentsDiscoverCache,
  peekMomentsSongAtoms,
  warmLyricMoments,
  warmLyricMomentsDiscoverHome,
  type LyricMomentRow,
} from '@/lib/primary-tab-prefetch'
import type { CatalogLyricAtom } from '@/lib/catalog-lyric-unit'
import type { CuratedMomentStored } from '@/lib/moments/curated-types'

export type { LyricMomentRow }

export type UseLyricMomentsOptions = {
  enabled?: boolean
  scope?: 'full' | 'discover-home'
}

export function useLyricMoments(options: UseLyricMomentsOptions = {}) {
  const enabled = options.enabled ?? true
  const scope = options.scope ?? 'full'
  const discoverHome = scope === 'discover-home'
  const cached = discoverHome ? peekMomentsDiscoverCache() : peekMomentsCache()
  const cachedAtoms = peekMomentsSongAtoms()
  const cachedCurated = peekCuratedMomentsBySong()
  const [moments, setMoments] = useState<LyricMomentRow[]>(cached?.data ?? [])
  const [songAtomsBySongId, setSongAtomsBySongId] = useState<Record<string, CatalogLyricAtom[]>>(
    cachedAtoms ?? {},
  )
  const [curatedBySongId, setCuratedBySongId] = useState<Record<string, CuratedMomentStored[]>>(
    cachedCurated ?? {},
  )
  const [loading, setLoading] = useState(!(cached?.data && cached.data.length > 0))
  const [hasMore, setHasMore] = useState(cached && 'hasMore' in cached ? cached.hasMore : !discoverHome)
  const lastLoadedAtRef = useRef(cached?.loadedAt ?? 0)

  const load = useCallback(async (force = false) => {
    const rows = discoverHome
      ? await warmLyricMomentsDiscoverHome({ force })
      : await warmLyricMoments({ force })
    setMoments(rows)
    setSongAtomsBySongId(peekMomentsSongAtoms() ?? {})
    if (!discoverHome) {
      setCuratedBySongId(peekCuratedMomentsBySong() ?? {})
    }
    if (discoverHome) {
      setHasMore(peekMomentsDiscoverCache()?.hasMore ?? true)
    }
    setLoading(false)
    lastLoadedAtRef.current = Date.now()
    return rows
  }, [discoverHome])

  const loadMore = useCallback(async () => {
    if (!discoverHome) return []
    const rows = await loadMoreLyricMomentsDiscoverHome()
    setMoments(rows)
    setSongAtomsBySongId(peekMomentsSongAtoms() ?? {})
    setHasMore(peekMomentsDiscoverCache()?.hasMore ?? false)
    lastLoadedAtRef.current = Date.now()
    return rows
  }, [discoverHome])

  useEffect(() => {
    if (!enabled) return

    const neverLoaded = lastLoadedAtRef.current === 0
    const stale = Date.now() - lastLoadedAtRef.current > PRIMARY_TAB_STALE_MS
    if (neverLoaded || stale) {
      void load(stale && !neverLoaded)
    }
  }, [enabled, load])

  return {
    moments,
    songAtomsBySongId,
    curatedBySongId,
    loading,
    hasMore,
    refetch: () => load(true),
    loadMore,
  }
}

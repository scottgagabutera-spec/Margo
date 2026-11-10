'use client'

import { useCallback, useEffect, useState } from 'react'
import { DISCOVER_HOME_BATCH, DISCOVER_HOME_NEAR_END_TILES } from '@/lib/discover-home-batch'

/** Progressive reveal for Discover home rows — no layout change, same tile sizes. */
export function useDiscoverCarouselWindow<T>(
  items: T[],
  onNeedMoreData?: () => void,
) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(DISCOVER_HOME_BATCH, items.length),
  )

  useEffect(() => {
    setVisibleCount((prev) => Math.min(Math.max(prev, DISCOVER_HOME_BATCH), items.length || DISCOVER_HOME_BATCH))
  }, [items.length])

  const visible = items.slice(0, Math.min(visibleCount, items.length))

  const onNearEnd = useCallback(() => {
    if (visibleCount < items.length) {
      setVisibleCount((n) => Math.min(n + DISCOVER_HOME_BATCH, items.length))
      return
    }
    onNeedMoreData?.()
  }, [items.length, onNeedMoreData, visibleCount])

  return { visible, onNearEnd, nearEndTiles: DISCOVER_HOME_NEAR_END_TILES }
}

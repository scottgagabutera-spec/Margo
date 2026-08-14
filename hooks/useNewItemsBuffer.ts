'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { scrollActiveTo } from '@/components/primary-tab-shell'

export interface UseNewItemsBufferResult<T extends { id: string }> {
  /** Stable list shown in the UI (may lag live while scrolled). */
  items: T[]
  /** Count of brand-new items waiting to be revealed. */
  pendingCount: number
  /** Merge pending into the list and scroll to top (pill tap). */
  flushPending: () => void
  /**
   * Force displayed = snapshot (or current live) and clear the buffer.
   * Pass the array returned from reload() after pull-to-refresh so PTR
   * and the pill never fight over which list wins.
   */
  applyImmediate: (snapshot?: T[]) => void
}

/**
 * Buffers newly arrived list head items so the visible list never auto-jumps
 * (X/Twitter "Show N posts" pattern). Updates/deletes to already-visible
 * rows still apply in place so resonate counts stay live.
 *
 * Not wired inside usePosts — Profile / Music keep immediate updates.
 * Feed and Discover compose this hook around the shared posts stream.
 */
export function useNewItemsBuffer<T extends { id: string }>(
  liveItems: T[],
  _options?: { scrollThresholdPx?: number }
): UseNewItemsBufferResult<T> {
  const liveRef = useRef(liveItems)
  liveRef.current = liveItems

  const [displayed, setDisplayed] = useState<T[]>(liveItems)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const displayedRef = useRef(displayed)
  displayedRef.current = displayed
  const seededRef = useRef(false)

  useEffect(() => {
    const live = liveItems

    if (!seededRef.current) {
      if (live.length === 0) return
      seededRef.current = true
      displayedRef.current = live
      setDisplayed(live)
      setPendingIds([])
      return
    }

    const prev = displayedRef.current
    if (live.length === 0 && prev.length > 0) return

    if (prev.length === 0) {
      displayedRef.current = live
      setDisplayed(live)
      setPendingIds([])
      return
    }

    const prevIds = new Set(prev.map((p) => p.id))
    const liveById = new Map(live.map((item) => [item.id, item]))
    const brandNew = live.filter((item) => !prevIds.has(item.id))

    const refreshed = prev
      .filter((p) => liveById.has(p.id))
      .map((p) => liveById.get(p.id)!)

    if (brandNew.length === 0) {
      displayedRef.current = refreshed
      setDisplayed(refreshed)
      setPendingIds((ids) => ids.filter((id) => liveById.has(id)))
      return
    }

    displayedRef.current = refreshed
    setDisplayed(refreshed)
    setPendingIds((ids) => {
      const next = new Set(ids)
      for (const item of brandNew) next.add(item.id)
      return [...next].filter((id) => liveById.has(id))
    })
  }, [liveItems])

  const flushPending = useCallback(() => {
    const next = liveRef.current
    displayedRef.current = next
    setDisplayed(next)
    setPendingIds([])
    scrollActiveTo(0, 'smooth')
  }, [])

  const applyImmediate = useCallback((snapshot?: T[]) => {
    const next = snapshot ?? liveRef.current
    displayedRef.current = next
    setDisplayed(next)
    setPendingIds([])
  }, [])

  return {
    items: displayed,
    pendingCount: pendingIds.length,
    flushPending,
    applyImmediate,
  }
}

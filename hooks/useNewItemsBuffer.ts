'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { scrollActiveTo } from '@/components/primary-tab-shell'

export interface UseNewItemsBufferResult<T extends { id: string }> {
  /** Stable list shown in the UI (may lag live while scrolled). */
  items: T[]
  /** False until the first real snapshot (or a confirmed empty live list). */
  seeded: boolean
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
  options?: { scrollThresholdPx?: number; settleEmpty?: boolean }
): UseNewItemsBufferResult<T> {
  const settleEmpty = options?.settleEmpty === true
  const liveRef = useRef(liveItems)
  liveRef.current = liveItems

  const [displayed, setDisplayed] = useState<T[]>(liveItems)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [seeded, setSeeded] = useState(liveItems.length > 0)
  const displayedRef = useRef(displayed)
  displayedRef.current = displayed
  const seededRef = useRef(seeded)

  useLayoutEffect(() => {
    const live = liveItems

    if (!seededRef.current) {
      if (live.length === 0 && !settleEmpty) return
      seededRef.current = true
      displayedRef.current = live
      setDisplayed(live)
      setPendingIds([])
      setSeeded(true)
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
  }, [liveItems, settleEmpty])

  const flushPending = useCallback(() => {
    const next = liveRef.current
    displayedRef.current = next
    seededRef.current = true
    setDisplayed(next)
    setPendingIds([])
    setSeeded(true)
    scrollActiveTo(0, 'smooth')
  }, [])

  const applyImmediate = useCallback((snapshot?: T[]) => {
    const next = snapshot ?? liveRef.current
    displayedRef.current = next
    seededRef.current = true
    setDisplayed(next)
    setPendingIds([])
    setSeeded(true)
  }, [])

  return {
    items: displayed,
    seeded,
    pendingCount: pendingIds.length,
    flushPending,
    applyImmediate,
  }
}

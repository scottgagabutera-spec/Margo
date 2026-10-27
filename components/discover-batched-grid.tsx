'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  discoverVmHasMore,
  discoverVmVisibleItems,
  type DiscoverVmGridKind,
} from '@/lib/discover-view-more-layout'

export function DiscoverBatchedGrid<T>({
  kind,
  items,
  batchSize,
  resetKey,
  loading,
  skeletonCount,
  getKey,
  renderItem,
  emptyMessage = 'Nothing here yet.',
}: {
  kind: DiscoverVmGridKind
  items: T[]
  batchSize: number
  /** Changes when filters/sort change — resets batch and scroll. */
  resetKey: string
  loading?: boolean
  skeletonCount: number
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  emptyMessage?: string
}) {
  const [visibleCount, setVisibleCount] = useState(batchSize)
  const gridTopRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleCount(batchSize)
    gridTopRef.current?.scrollIntoView({ block: 'start' })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [resetKey, batchSize])

  const visible = discoverVmVisibleItems(items, visibleCount)
  const hasMore = discoverVmHasMore(items, visibleCount)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(c => Math.min(c + batchSize, items.length))
        }
      },
      { root: null, rootMargin: '240px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [batchSize, hasMore, items.length, visibleCount])

  if (loading) {
    return (
      <div ref={gridTopRef}>
        <div className="discover-vm-grid" data-kind={kind} data-testid="discover-vm-grid">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <div key={i} className="discover-vm-skeleton" aria-hidden />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div ref={gridTopRef}>
        <p className="discover-vm-empty" data-discover-vm-empty>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div ref={gridTopRef}>
      <div
        className="discover-vm-grid"
        data-kind={kind}
        data-testid="discover-vm-grid"
        data-visible-count={visible.length}
        data-total-count={items.length}
      >
        {visible.map(item => (
          <div key={getKey(item)} style={{ minWidth: 0 }}>
            {renderItem(item)}
          </div>
        ))}
        {hasMore ? (
          <div ref={sentinelRef} className="discover-vm-sentinel" data-discover-vm-sentinel aria-hidden />
        ) : null}
      </div>
    </div>
  )
}

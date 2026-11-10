'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
  discoverVmHasMore,
  discoverVmVisibleItems,
  type DiscoverVmGridKind,
} from '@/lib/discover-view-more-layout'
import { useMargoPageResume } from '@/hooks/useMargoPageResume'
import { pageResumeKeyForPath } from '@/lib/margo-page-resume'
import { readScrollLive } from '@/lib/margo-scroll-live'
import { restoreExactWindowScroll } from '@/lib/margo-exact-scroll-restore'

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
  rememberPosition = true,
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
  /** Keep scroll and loaded batch when leaving and returning. */
  rememberPosition?: boolean
}) {
  const pathname = usePathname() ?? ''
  const pageKey = pageResumeKeyForPath(pathname)
  const [visibleCount, setVisibleCount] = useState(batchSize)
  const gridTopRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const prevResetRef = useRef<string | null>(null)
  const hadResumeRef = useRef(false)

  useMargoPageResume({
    pageKey,
    enabled: rememberPosition && !loading,
    readExtra: () => ({ n: visibleCount }),
    onResume: (entry) => {
      hadResumeRef.current = true
      if (typeof entry.n === 'number' && entry.n > batchSize) {
        setVisibleCount((c) => Math.max(c, Math.min(entry.n!, items.length || entry.n!)))
      }
    },
  })

  useEffect(() => {
    if (prevResetRef.current === null) {
      prevResetRef.current = resetKey
      if (!hadResumeRef.current) {
        setVisibleCount(batchSize)
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'auto' })
        }
      }
      return
    }
    if (prevResetRef.current === resetKey) return
    prevResetRef.current = resetKey
    hadResumeRef.current = false
    setVisibleCount(batchSize)
    gridTopRef.current?.scrollIntoView({ block: 'start' })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [resetKey, batchSize])

  const visible = discoverVmVisibleItems(items, visibleCount)
  const hasMore = discoverVmHasMore(items, visibleCount)

  useEffect(() => {
    if (!rememberPosition || !hadResumeRef.current || loading) return
    const row = readScrollLive(pageKey)
    if (row?.y && row.y > 0) {
      restoreExactWindowScroll(row.y)
    }
  }, [visible.length, rememberPosition, loading, pageKey])

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

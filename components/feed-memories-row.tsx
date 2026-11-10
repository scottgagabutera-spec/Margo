'use client'

import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { MargoSectionHeader } from '@/components/margo-section-header'
import { FeedMemoryRowTile } from '@/components/feed-memory-row-tile'
import type { MemoryPublic } from '@/lib/memory/types'
import { openFeedTab } from '@/lib/feed-mix-nav'

export function FeedMemoriesRow({
  memories,
  hasMore,
}: {
  memories: MemoryPublic[]
  hasMore: boolean
}) {
  const router = useRouter()
  if (memories.length === 0) return null

  return (
    <div className="margo-feed-memories-row">
      <MargoSectionHeader
        title="Memories"
        className="margo-feed-memories-row__head"
        action={
          <button
            type="button"
            className="margo-feed-memories-row__see-all margo-btn margo-btn--icon"
            aria-label="See all memories"
            onClick={() => openFeedTab(router, 'memories')}
          >
            <ChevronRightIcon size={16} color="var(--text-secondary)" />
          </button>
        }
      />
      <div className="margo-feed-memories-row__scroller">
        {memories.map((m, i) => (
          <FeedMemoryRowTile key={m.id} memory={m} priority={i < 2} />
        ))}
        {hasMore ? (
          <button
            type="button"
            className="margo-feed-memories-row__peek margo-btn margo-btn--icon"
            aria-label="More memories"
            onClick={() => openFeedTab(router, 'memories')}
          >
            <ChevronRightIcon size={18} color="var(--text-secondary)" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { ChevronRightIcon } from '@/components/icons'
import { MargoSectionHeader } from '@/components/margo-section-header'
import { FeedMemoryRowTile } from '@/components/feed-memory-row-tile'
import type { MemoryPublic } from '@/lib/memory/types'
import { persistFeedReturnBeforeLeave } from '@/lib/margo-feed-return'

export function FeedMemoriesRow({
  memories,
  hasMore,
}: {
  memories: MemoryPublic[]
  hasMore: boolean
}) {
  if (memories.length === 0) return null

  return (
    <div className="margo-feed-memories-row">
      <MargoSectionHeader
        title="Memories"
        className="margo-feed-memories-row__head"
        action={
          <Link
            href="/feed?tab=memories"
            className="margo-feed-memories-row__see-all"
            aria-label="See all memories"
            onClick={() => persistFeedReturnBeforeLeave('lyrics')}
          >
            <ChevronRightIcon size={16} color="var(--gold)" />
          </Link>
        }
      />
      <div className="margo-feed-memories-row__scroller">
        {memories.map((m, i) => (
          <FeedMemoryRowTile key={m.id} memory={m} priority={i < 2} />
        ))}
        {hasMore ? (
          <Link
            href="/feed?tab=memories"
            className="margo-feed-memories-row__peek"
            aria-label="More memories"
            onClick={() => persistFeedReturnBeforeLeave('lyrics')}
          >
            <ChevronRightIcon size={18} color="var(--gold)" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

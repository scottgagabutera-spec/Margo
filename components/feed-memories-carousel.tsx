'use client'

import { ProfileMemoryMoreTile, ProfileMemoryTile } from '@/components/profile-memory-tile'
import type { MemoryPublic } from '@/lib/memory/types'
import { MargoSectionHeader } from '@/components/margo-section-header'

export const FEED_MEMORY_CAROUSEL_CHUNK = 5

export function FeedMemoriesCarousel({
  memories,
  hasMore,
}: {
  memories: MemoryPublic[]
  hasMore: boolean
}) {
  if (memories.length === 0) return null

  return (
    <section className="margo-feed-memory-carousel" aria-label="Memories">
      <MargoSectionHeader
        title="Memories"
        actionHref="/feed?tab=memories"
        className="margo-feed-memory-carousel__head"
      />
      <div className="margo-profile-memories-strip__row margo-feed-memory-carousel__row">
        {memories.map((m, i) => (
          <ProfileMemoryTile key={m.id} memory={m} priority={i < 2} />
        ))}
        {hasMore ? (
          <ProfileMemoryMoreTile href="/feed?tab=memories" label="More" />
        ) : null}
      </div>
    </section>
  )
}

'use client'

import Link from 'next/link'
import { ProfileMemoryMoreTile, ProfileMemoryTile } from '@/components/profile-memory-tile'
import type { MemoryPublic } from '@/lib/memory/types'
import { UI_FONT } from '@/lib/fonts'

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
      <div className="margo-feed-memory-carousel__head">
        <p className="margo-profile-ui-label margo-feed-memory-carousel__label">Memories</p>
        <Link href="/feed?tab=memories" className="margo-feed-memory-carousel__see-all">
          See all
        </Link>
      </div>
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

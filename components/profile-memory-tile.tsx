'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MemoryCoverCaption } from '@/components/memory-cover-caption'
import { memoryDisplayCaption } from '@/lib/memory/display-caption'
import { memoryGridCoverSource, memoryProfileTileThumbnailUrl } from '@/lib/memory/feed-thumbnail-url'
import type { MemoryPublic } from '@/lib/memory/types'

export function ProfileMemoryAddTile() {
  return (
    <Link href="/memories/new" className="margo-profile-memory-tile margo-profile-memory-tile--add" aria-label="New memory">
      <span className="margo-profile-memory-tile__plus" aria-hidden>+</span>
    </Link>
  )
}

export function ProfileMemoryTile({
  memory,
  priority = false,
}: {
  memory: MemoryPublic
  priority?: boolean
}) {
  const label = memoryDisplayCaption(memory)
  const { src, isVideo } = memoryGridCoverSource(memory)
  const thumb = memoryProfileTileThumbnailUrl(src || memory.coverUrl)

  return (
    <Link
      href={`/memory/${memory.id}`}
      className="margo-profile-memory-tile margo-profile-memory-tile--captioned"
      aria-label={label}
    >
      {thumb ? (
        <Image
          src={thumb}
          alt=""
          fill
          sizes="80px"
          className="margo-profile-memory-tile__img"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
        />
      ) : null}
      {isVideo ? (
        <span className="margo-profile-memory-tile__video-badge" aria-hidden>
          ▶
        </span>
      ) : null}
      <MemoryCoverCaption memory={memory} variant="tile" />
    </Link>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MemoryCoverCaption } from '@/components/memory-cover-caption'
import { memoryCaptionTitle, memoryDisplayCaption, memoryIsWordsOnly } from '@/lib/memory/display-caption'
import { memoryGridCoverSource, memoryProfileTileThumbnailUrl } from '@/lib/memory/feed-thumbnail-url'
import type { MemoryPublic } from '@/lib/memory/types'
import { MemoryTileTitle } from '@/components/memory-tile-title'
import { memoryWordsOnlyBackground, memoryWordsOnlySampleColor } from '@/lib/memory/words-only-palette'

export function ProfileMemoryAddTile({ labeled }: { labeled?: boolean }) {
  return (
    <Link
      href="/memories/new"
      className={`margo-profile-memory-tile margo-profile-memory-tile--add${labeled ? ' margo-profile-memory-tile--add-cta' : ''}`}
      aria-label="Add a memory"
    >
      <span className="margo-profile-memory-tile__plus" aria-hidden>+</span>
      {labeled ? <span className="margo-profile-memory-tile__add-label">Add a memory</span> : null}
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
  const { src, isVideo, wordsOnly } = memoryGridCoverSource(memory)
  const thumb = wordsOnly ? '' : memoryProfileTileThumbnailUrl(src || memory.coverUrl)
  const wordsTitle = memoryCaptionTitle(memory)

  return (
    <Link
      href={`/memory/${memory.id}`}
      className={`margo-profile-memory-tile margo-profile-memory-tile--captioned${wordsOnly ? ' margo-profile-memory-tile--words-only' : ''}`}
      aria-label={label}
      style={wordsOnly ? { background: memoryWordsOnlyBackground(memory.id) } : undefined}
    >
      {wordsOnly ? (
        <span className="margo-profile-memory-tile__words-only-title">
          <MemoryTileTitle
            text={wordsTitle}
            variant="words"
            sampleBg={memoryWordsOnlySampleColor(memory.id)}
            useLora
          />
        </span>
      ) : null}
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
      {wordsOnly ? null : <MemoryCoverCaption memory={memory} variant="tile" />}
    </Link>
  )
}

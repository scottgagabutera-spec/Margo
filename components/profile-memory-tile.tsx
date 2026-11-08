'use client'

import Link from 'next/link'
import { PlusIcon } from '@/components/icons'
import Image from 'next/image'
import { MemoryCoverCaption } from '@/components/memory-cover-caption'
import { memoryCaptionTitle, memoryDisplayCaption, memoryIsWordsOnly } from '@/lib/memory/display-caption'
import { memoryGridCoverSource, memoryProfileTileThumbnailUrl } from '@/lib/memory/feed-thumbnail-url'
import type { MemoryPublic } from '@/lib/memory/types'
import { MemoryTileTitle } from '@/components/memory-tile-title'
import { memoryWordsOnlyBackground, memoryWordsOnlySampleColor } from '@/lib/memory/words-only-palette'
import { formatMemoryDisplayDate } from '@/lib/memory/date-label'

export function ProfileMemoryMoreTile({ href, label }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="margo-profile-memory-tile margo-profile-memory-tile--more"
      aria-label={label ?? 'More memories'}
    >
      <span className="margo-profile-memory-tile__more-label">{label ?? 'More'}</span>
    </Link>
  )
}

export function ProfileMemoryAddTile({ labeled }: { labeled?: boolean }) {
  return (
    <Link
      href="/memories/new"
      className={`margo-profile-memory-tile margo-profile-memory-tile--add${labeled ? ' margo-profile-memory-tile--add-cta' : ''}`}
      aria-label="Add a memory"
    >
      <span className="margo-profile-memory-tile__plus" aria-hidden>
        <PlusIcon size={22} color="var(--gold)" />
      </span>
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
  const dateChip = formatMemoryDisplayDate({
    dateGranularity: memory.dateGranularity,
    dateStart: memory.dateStart,
    dateEnd: memory.dateEnd,
    showDatePublicly: memory.showDatePublicly,
    createdAt: memory.createdAt,
    songCount: memory.songCount,
    photoCount: memory.photos.length,
  })

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
          {dateChip ? (
            <span className="margo-memory-cover-caption__date margo-memory-cover-caption__date--words">{dateChip}</span>
          ) : null}
        </span>
      ) : null}
      {thumb ? (
        <Image
          src={thumb}
          alt=""
          fill
          sizes="(max-width: 767px) 140px, 140px"
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

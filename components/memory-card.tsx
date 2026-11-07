'use client'

import Link from 'next/link'
import { MemoryCoverCaption } from '@/components/memory-cover-caption'
import { UI_FONT, TYPE } from '@/lib/fonts'
import { memoryCaptionTitle, memoryDisplayCaption } from '@/lib/memory/display-caption'
import { formatMemoryDatePublic } from '@/lib/memory/date-label'
import type { MemoryPublic } from '@/lib/memory/types'

const font = UI_FONT

export type MemoryCardVariant = 'feed' | 'profileGrid' | 'profileTimelineRow'

export function MemoryCard({
  memory,
  variant,
  href,
}: {
  memory: MemoryPublic
  variant: MemoryCardVariant
  href?: string
}) {
  const to = href || `/memory/${memory.id}`
  const dateChip = formatMemoryDatePublic({
    granularity: memory.dateGranularity,
    dateStart: memory.dateStart,
    dateEnd: memory.dateEnd,
    showDatePublicly: memory.showDatePublicly,
  })
  const story = (memory.story || '').trim()

  if (variant === 'profileTimelineRow') {
    return (
      <Link href={to} className="margo-memory-card margo-memory-card--timeline">
        <span className="margo-memory-card__timeline-art" style={{ backgroundImage: memory.coverUrl ? `url(${memory.coverUrl})` : undefined }} />
        <span className="margo-memory-card__timeline-copy">
          <span className="margo-memory-card__title" style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--gold)', fontWeight: 500 }}>{memoryCaptionTitle(memory)}</span>
          {story ? (
            <span className="margo-memory-card__story" style={{ fontFamily: font, fontSize: TYPE.meta }}>{story}</span>
          ) : null}
        </span>
      </Link>
    )
  }

  const grid = variant === 'profileGrid'
  const compactVisual = grid || variant === 'feed'
  const caption = memoryDisplayCaption(memory)
  return (
    <Link
      href={to}
      className={`margo-memory-card${grid ? ' margo-memory-card--grid' : ''}${variant === 'feed' ? ' margo-memory-card--feed' : ''}`}
      aria-label={caption}
    >
      <span
        className="margo-memory-card__cover"
        style={{ backgroundImage: memory.coverUrl ? `url(${memory.coverUrl})` : undefined }}
      >
        {compactVisual ? (
          <MemoryCoverCaption memory={memory} variant={variant === 'feed' ? 'feed' : 'grid'} />
        ) : null}
        {dateChip && !compactVisual ? <span className="margo-memory-card__date-chip">{dateChip}</span> : null}
      </span>
      {compactVisual ? null : (
        <span className="margo-memory-card__body">
          <span className="margo-memory-card__title" style={{ fontFamily: font, fontSize: TYPE.secondary }}>
            {caption}
          </span>
          {story ? (
            <span className="margo-memory-card__story" style={{ fontFamily: font, fontSize: TYPE.meta }}>
              {story}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  )
}

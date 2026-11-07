'use client'

import Link from 'next/link'
import { UI_FONT, TYPE } from '@/lib/fonts'
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
          <span className="margo-memory-card__title" style={{ fontFamily: font, fontSize: TYPE.secondary }}>{memory.title}</span>
          {story ? (
            <span className="margo-memory-card__story" style={{ fontFamily: font, fontSize: TYPE.meta }}>{story}</span>
          ) : null}
        </span>
      </Link>
    )
  }

  const grid = variant === 'profileGrid'
  return (
    <Link
      href={to}
      className={`margo-memory-card${grid ? ' margo-memory-card--grid' : ''}${variant === 'feed' ? ' margo-memory-card--feed' : ''}`}
    >
      <span
        className="margo-memory-card__cover"
        style={{ backgroundImage: memory.coverUrl ? `url(${memory.coverUrl})` : undefined }}
      />
      {dateChip ? <span className="margo-memory-card__date-chip">{dateChip}</span> : null}
      <span className="margo-memory-card__body">
        <span className="margo-memory-card__title" style={{ fontFamily: font, fontSize: grid ? TYPE.label : TYPE.secondary }}>
          {memory.title}
        </span>
        {story ? (
          <span className={`margo-memory-card__story${variant === 'feed' ? ' margo-memory-card__story--clamp' : ''}`} style={{ fontFamily: font, fontSize: TYPE.meta }}>
            {story}
          </span>
        ) : null}
        {variant === 'feed' ? (
          <span className="margo-memory-card__see-more" style={{ fontFamily: font, fontSize: '0.8125rem', fontWeight: 500 }}>See more</span>
        ) : null}
      </span>
    </Link>
  )
}

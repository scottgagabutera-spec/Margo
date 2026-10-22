'use client'

import { useEffect, useRef } from 'react'
import {
  FEED_VIBE_CHIP_KEYS,
  feedFilterToChipKey,
  feedVibeChipLabel,
  type FeedVibeChipKey,
} from '@/lib/feed-vibe-chips'

type Props = {
  selectedVibe: string
  onSelectVibe: (key: FeedVibeChipKey) => void
}

export function FeedVibeChipRow({ selectedVibe, onSelectVibe }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Partial<Record<FeedVibeChipKey, HTMLButtonElement | null>>>({})
  const activeKey = feedFilterToChipKey(selectedVibe)

  useEffect(() => {
    const btn = chipRefs.current[activeKey]
    const scroller = scrollerRef.current
    if (!btn || !scroller) return
    try {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    } catch {
      btn.scrollIntoView(false)
    }
  }, [activeKey])

  const chips: FeedVibeChipKey[] = ['ALL', ...FEED_VIBE_CHIP_KEYS]

  return (
    <div className="margo-feed-vibe-chip-row" role="region" aria-label="Filter feed by vibe">
      <div ref={scrollerRef} className="margo-feed-vibe-chip-row__scroller">
        {chips.map((key) => {
          const selected = key === activeKey
          return (
            <button
              key={key}
              type="button"
              ref={(el) => {
                chipRefs.current[key] = el
              }}
              className={`margo-feed-vibe-chip${selected ? ' margo-feed-vibe-chip--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelectVibe(key)}
            >
              {feedVibeChipLabel(key)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

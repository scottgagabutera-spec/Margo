'use client'

import { MusicNoteIcon } from '@/components/icons'
import { memoryCoverIsSongArt, memoryDisplayCaption } from '@/lib/memory/display-caption'
import type { MemoryPublic } from '@/lib/memory/types'

export function MemoryCoverCaption({
  memory,
  variant,
}: {
  memory: MemoryPublic
  variant: 'tile' | 'grid' | 'feed'
}) {
  const caption = memoryDisplayCaption(memory)
  const songArt = memoryCoverIsSongArt(memory)
  return (
    <span className={`margo-memory-cover-caption margo-memory-cover-caption--${variant}`}>
      {songArt ? (
        <span className="margo-memory-cover-caption__icon" aria-hidden>
          <MusicNoteIcon size={variant === 'tile' ? 9 : 11} color="rgba(255,255,255,0.92)" />
        </span>
      ) : null}
      <span className="margo-memory-cover-caption__text">{caption}</span>
    </span>
  )
}

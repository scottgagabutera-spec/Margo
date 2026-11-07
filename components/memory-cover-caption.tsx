'use client'

import { MusicNoteIcon } from '@/components/icons'
import { memoryCaptionArtists, memoryCaptionTitle, memoryCoverIsSongArt } from '@/lib/memory/display-caption'
import { MemoryTileTitle } from '@/components/memory-tile-title'
import type { MemoryPublic } from '@/lib/memory/types'

export function MemoryCoverCaption({
  memory,
  variant,
}: {
  memory: MemoryPublic
  variant: 'tile' | 'grid' | 'feed'
}) {
  const title = memoryCaptionTitle(memory)
  const artists = memoryCaptionArtists(memory)
  const songArt = memoryCoverIsSongArt(memory)
  return (
    <span className={`margo-memory-cover-caption margo-memory-cover-caption--${variant}`}>
      {songArt ? (
        <span className="margo-memory-cover-caption__icon" aria-hidden>
          <MusicNoteIcon size={variant === 'tile' ? 9 : 11} color="rgba(255,255,255,0.92)" />
        </span>
      ) : null}
      {variant === 'tile' ? (
        <MemoryTileTitle text={title} variant="scrim" sampleBg="#14121a" />
      ) : (
        <span className="margo-memory-cover-caption__text">{title}</span>
      )}
      {variant !== 'tile' && artists ? <span className="margo-memory-cover-caption__artists">{artists}</span> : null}
    </span>
  )
}

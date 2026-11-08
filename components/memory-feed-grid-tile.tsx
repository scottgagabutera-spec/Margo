'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MargoAvatar } from '@/components/margo-avatar'
import { MemoryCoverCaption } from '@/components/memory-cover-caption'
import { MusicNoteIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { memoryCoverIsSongArt, memoryCaptionTitle, memoryDisplayCaption } from '@/lib/memory/display-caption'
import { memoryGridCoverSource } from '@/lib/memory/feed-thumbnail-url'
import type { MemoryPublic } from '@/lib/memory/types'
import { MemoryResonateButton } from '@/components/memory-resonate-button'
import { leaveFeedTo } from '@/lib/feed-exit-nav'

export function MemoryFeedGridTile({ memory: initial }: { memory: MemoryPublic }) {
  const router = useRouter()
  const [memory, setMemory] = useState(initial)
  useEffect(() => setMemory(initial), [initial])
  const { src, isVideo, wordsOnly } = memoryGridCoverSource(memory)
  const caption = memoryDisplayCaption(memory)
  const songArt = memoryCoverIsSongArt(memory)
  return (
    <Link
      href={`/memory/${memory.id}`}
      className="margo-feed-memory-grid-tile margo-mix-press"
      data-margo-memory-tile={memory.id}
      aria-label={caption}
      onClick={(event) => {
        event.preventDefault()
        leaveFeedTo(router, `/memory/${memory.id}`, 'memories')
      }}
    >
      <span className="margo-feed-memory-grid-tile__art">
        {wordsOnly ? (
          <span className="margo-feed-memory-grid-tile__img margo-feed-memory-grid-tile__img--words-only">
            {memoryCaptionTitle(memory)}
          </span>
        ) : src ? (
          <Image
            src={src}
            alt=""
            width={400}
            height={500}
            className="margo-feed-memory-grid-tile__img"
            loading="lazy"
            sizes="(max-width: 639px) 48vw, 320px"
            unoptimized
          />
        ) : (
          <span className="margo-feed-memory-grid-tile__img margo-feed-memory-grid-tile__img--empty" />
        )}
        <MemoryCoverCaption memory={memory} variant="grid" />
        {isVideo ? (
          <span className="margo-feed-memory-grid-tile__play" aria-hidden>
            <PlayPauseIcon playing={false} size={14} color="#fff" />
          </span>
        ) : null}
      </span>
      <span className="margo-feed-memory-grid-tile__meta">
        <span className="margo-feed-memory-grid-tile__author">
          <MargoAvatar
            size="xs"
            imageUrl={memory.ownerAvatarUrl}
            username={memory.ownerUsername}
            displayName={memory.ownerDisplayName}
          />
          <span className="margo-feed-memory-grid-tile__name">@{memory.ownerUsername}</span>
        </span>
        <span className="margo-feed-memory-grid-tile__stats">
          <span className="margo-feed-memory-grid-tile__song">
            {songArt || memory.songCount > 0 ? (
              <MusicNoteIcon size={11} color="var(--text-muted)" />
            ) : null}
            <span className="margo-feed-memory-grid-tile__song-label">
              {memory.songCount > 1 ? String(memory.songCount) : songArt ? '' : null}
            </span>
          </span>
          <MemoryResonateButton memory={memory} onMemoryChange={setMemory} compact />
        </span>
      </span>
    </Link>
  )
}

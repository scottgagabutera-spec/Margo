'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MemoryCoverCaption } from '@/components/memory-cover-caption'
import { FeedIconHeart } from '@/components/feed-card-icons'
import { MusicNoteIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { memoryCoverIsSongArt, memoryDisplayCaption } from '@/lib/memory/display-caption'
import { memoryGridCoverSource } from '@/lib/memory/feed-thumbnail-url'
import type { MemoryPublic } from '@/lib/memory/types'

export function MemoryFeedGridTile({ memory }: { memory: MemoryPublic }) {
  const { src, isVideo } = memoryGridCoverSource(memory)
  const caption = memoryDisplayCaption(memory)
  const songArt = memoryCoverIsSongArt(memory)
  const avatar = memory.ownerAvatarUrl ? compactArtworkUrl(memory.ownerAvatarUrl, 48) : null
  return (
    <Link href={`/memory/${memory.id}`} className="margo-feed-memory-grid-tile" aria-label={caption}>
      <span className="margo-feed-memory-grid-tile__art">
        {src ? (
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
          {avatar ? (
            <Image
              src={avatar}
              alt=""
              width={20}
              height={20}
              className="margo-feed-memory-grid-tile__avatar"
              loading="lazy"
              unoptimized
            />
          ) : (
            <span className="margo-feed-memory-grid-tile__avatar margo-feed-memory-grid-tile__avatar--empty" />
          )}
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
          <span className="margo-feed-memory-grid-tile__resonate">
            <FeedIconHeart size={11} />
            <span>{memory.resonateCount.toLocaleString()}</span>
          </span>
        </span>
      </span>
    </Link>
  )
}

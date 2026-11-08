'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ImagePlusIcon, LyricBackIcon, MusicNoteIcon } from '@/components/icons'
import { memoryCaptionTitle } from '@/lib/memory/display-caption'
import { memoryGridCoverSource, memoryFeedRowThumbnailUrl } from '@/lib/memory/feed-thumbnail-url'
import { formatMemoryDisplayDate } from '@/lib/memory/date-label'
import { memoryTileKind } from '@/lib/memory/memory-tile-kind'
import type { MemoryPublic } from '@/lib/memory/types'
import { memoryWordsOnlyBackground } from '@/lib/memory/words-only-palette'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'

const lyricFont = LYRIC_FONT
const uiFont = UI_FONT

function TypeIcon({ kind }: { kind: 'photo' | 'story' | 'listening' }) {
  if (kind === 'listening') return <MusicNoteIcon size={12} color="var(--gold)" />
  if (kind === 'story') return <LyricBackIcon size={12} color="var(--gold)" />
  return <ImagePlusIcon size={12} color="var(--gold)" />
}

export function FeedMemoryRowTile({ memory, priority = false }: { memory: MemoryPublic; priority?: boolean }) {
  const kind = memoryTileKind(memory)
  const title = memoryCaptionTitle(memory)
  const { src, isVideo, wordsOnly } = memoryGridCoverSource(memory)
  const thumb = wordsOnly ? '' : memoryFeedRowThumbnailUrl(src || memory.coverUrl)
  const dateChip = formatMemoryDisplayDate({
    dateGranularity: memory.dateGranularity,
    dateStart: memory.dateStart,
    dateEnd: memory.dateEnd,
    showDatePublicly: memory.showDatePublicly,
    createdAt: memory.createdAt,
    songCount: memory.songCount,
    photoCount: memory.photos.length,
  })
  const storyPreview = (memory.story || title).trim().split(/\s+/).slice(0, 12).join(' ')

  return (
    <Link href={`/memory/${memory.id}`} className="margo-feed-memory-row-tile" aria-label={title}>
      <MediaSquare
        kind={kind}
        thumb={thumb}
        isVideo={isVideo}
        wordsOnly={!!wordsOnly}
        memoryId={memory.id}
        storyPreview={storyPreview}
        priority={priority}
      />
      <p className="margo-feed-memory-row-tile__title" style={{ fontFamily: uiFont }}>
        {title}
      </p>
      {dateChip ? (
        <p className="margo-feed-memory-row-tile__date" style={{ fontFamily: uiFont }}>
          {dateChip}
        </p>
      ) : null}
    </Link>
  )
}

function MediaSquare({
  kind,
  thumb,
  isVideo,
  wordsOnly,
  memoryId,
  storyPreview,
  priority,
}: {
  kind: 'photo' | 'story' | 'listening'
  thumb: string
  isVideo: boolean
  wordsOnly: boolean
  memoryId: string
  storyPreview: string
  priority: boolean
}) {
  return (
    <div
      className={`margo-feed-memory-row-tile__media margo-feed-memory-row-tile__media--${kind}`}
      style={wordsOnly ? { background: memoryWordsOnlyBackground(memoryId) } : undefined}
    >
      <span className="margo-feed-memory-row-tile__type" aria-hidden>
        <TypeIcon kind={kind} />
      </span>
      {wordsOnly ? (
        <p className="margo-feed-memory-row-tile__story" style={{ fontFamily: lyricFont }}>
          {storyPreview}
        </p>
      ) : thumb ? (
        <Image
          src={thumb}
          alt=""
          fill
          sizes="200px"
          className="margo-feed-memory-row-tile__img"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
        />
      ) : (
        <span className="margo-feed-memory-row-tile__placeholder" aria-hidden />
      )}
      {isVideo ? <span className="margo-feed-memory-row-tile__video" aria-hidden /> : null}
    </div>
  )
}

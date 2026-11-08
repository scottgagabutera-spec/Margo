'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { memoryCaptionTitle } from '@/lib/memory/display-caption'
import { memoryGridCoverSource, memoryFeedRowThumbnailUrl } from '@/lib/memory/feed-thumbnail-url'
import { formatMemoryDisplayDate } from '@/lib/memory/date-label'
import { memoryTileKind } from '@/lib/memory/memory-tile-kind'
import type { MemoryPublic } from '@/lib/memory/types'
import { openFeedMemory } from '@/lib/feed-mix-nav'
import { useTapAck } from '@/hooks/use-tap-ack'
import { memoryWordsOnlyBackground } from '@/lib/memory/words-only-palette'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'

const lyricFont = LYRIC_FONT
const uiFont = UI_FONT

export function FeedMemoryRowTile({ memory, priority = false }: { memory: MemoryPublic; priority?: boolean }) {
  const router = useRouter()
  const { ack, isAcked } = useTapAck()
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
    <button
      type="button"
      className="margo-feed-memory-row-tile margo-mix-press"
      aria-label={title}
      data-margo-acked={isAcked() ? 1 : undefined}
      onPointerDown={() => ack()}
      onClick={() => openFeedMemory(router, memory.id)}
    >
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
    </button>
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

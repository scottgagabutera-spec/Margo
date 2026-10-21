'use client'

import { useState, useRef, useMemo } from 'react'
import type { Post } from '@/hooks/usePosts'
import type { PostLine } from '@/lib/post-lines'
import { resolveMomentLines } from '@/lib/post-lines'
import { FEED_ARTWORK_THUMB_PX } from '@/lib/feed/layout'
import { PostThumbnail } from '@/components/post-thumbnail'
import { SongMeta } from '@/components/song-meta'
import { FeedMomentPlaybackIcon } from '@/components/feed-card-icons'
import { FEED_TYPE } from '@/lib/fonts'
import {
  computePlaybackSegments,
  postLinesToSegmentInput,
} from '@/lib/moment/playback-segments'
import {
  resolveExternalListenUrl,
  externalListenAriaLabel,
} from '@/lib/moment/listen'
import { playOrTogglePostMoment } from '@/lib/audio-engine'
import { usePostMomentPlaybackUi, usePostMomentPlaybackMetrics } from '@/hooks/useAudioEngine'
import { useWarmAudioUrlOnVisible } from '@/hooks/useWarmAudioUrl'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'
import {
  feedLyricLayoutMode,
  feedLyricNeedsClamp,
  formatMomentClock,
  readLyricExpandedSession,
  sumSegmentDuration,
  writeLyricExpandedSession,
} from '@/lib/post-card-lyric-layout'
import { PendingNavLink } from '@/components/pending-nav-link'
import { trackEvent } from '@/lib/analytics/track'
import { FeedIconChevronRight, FeedIconExternal, FeedIconLyricsLines } from '@/components/feed-card-icons'

function MomentPlayControl({
  postId,
  lines,
  segments,
  primaryLine,
  combinedLyric,
}: {
  postId: string
  lines: PostLine[]
  segments: Array<{ startSec: number; endSec: number }>
  primaryLine: PostLine
  combinedLyric: string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const songId = primaryLine.songId || null
  const audioUrl = primaryLine.audioUrl || ''
  useWarmAudioUrlOnVisible(audioUrl, btnRef, true, segments[0]?.startSec ?? 0)
  const { playing, buffering } = usePostMomentPlaybackUi(postId, songId)

  const toggle = () => {
    if (!audioUrl || !songId || segments.length === 0) return
    playOrTogglePostMoment({
      postKey: postId,
      songId,
      audioUrl,
      title: primaryLine.songTitle || '',
      artist: primaryLine.artistName || '',
      artwork: primaryLine.artworkUrl ?? null,
      lineIndex: primaryLine.position ?? 0,
      lineText: combinedLyric,
      segments,
      atmosphere: livingAtmosphereOrNull(primaryLine.atmosphere),
      source: 'feed',
    })
  }

  const ariaPlay = playing
    ? (buffering ? 'Loading moment audio' : 'Pause moment')
    : 'Play moment'

  return (
    <button
      ref={btnRef}
      type="button"
      data-no-card-nav
      onClick={(e) => {
        e.stopPropagation()
        toggle()
      }}
      aria-label={ariaPlay}
      className="margo-post-card__moment-btn"
    >
      <FeedMomentPlaybackIcon playing={playing} buffering={buffering} size={18} color="var(--bg)" />
    </button>
  )
}

export function PostCardLyricSection({
  post,
  layoutMode,
}: {
  post: Post
  layoutMode: 'hero' | 'compact'
}) {
  const lines = resolveMomentLines(post)
  const multi = lines.length > 1
  const [expanded, setExpanded] = useState(() => readLyricExpandedSession(post.id))

  const setExpandedPersist = (next: boolean) => {
    setExpanded(next)
    writeLyricExpandedSession(post.id, next)
  }

  if (multi) {
    return (
      <div className={`margo-post-card__lyric-zone margo-post-card__lyric-zone--compact`}>
        {lines.map((line, i) => (
          <div key={line.id || `line-${line.position}-${i}`}>
            {i > 0 ? (
              <p className="margo-feed-stitch margo-post-card__stitch" aria-hidden>
                stitch
              </p>
            ) : null}
            <p className="margo-feed-lyric margo-feed-lyric--compact margo-post-card__lyric">
              &ldquo;{line.text}&rdquo;
            </p>
          </div>
        ))}
      </div>
    )
  }

  const text = lines[0]?.text || post.text || ''
  const needsClamp = layoutMode === 'compact' && feedLyricNeedsClamp(text)
  const hero = layoutMode === 'hero'

  return (
    <div
      className={[
        'margo-post-card__lyric-zone',
        hero ? 'margo-post-card__lyric-zone--hero' : 'margo-post-card__lyric-zone--compact',
      ].join(' ')}
    >
      <p
        className={[
          'margo-feed-lyric',
          'margo-post-card__lyric',
          hero ? 'margo-feed-lyric--hero' : 'margo-feed-lyric--compact',
          needsClamp && !expanded ? 'margo-feed-lyric--clamp-4' : '',
        ].filter(Boolean).join(' ')}
      >
        &ldquo;{text}&rdquo;
      </p>
      {needsClamp ? (
        <button
          type="button"
          className="margo-feed-lyric__more margo-post-card__lyric-more"
          data-no-card-nav
          onClick={(e) => {
            e.stopPropagation()
            setExpandedPersist(!expanded)
          }}
        >
          {expanded ? 'less' : 'more'}
        </button>
      ) : null}
    </div>
  )
}

export function PostCardSongSection({
  post,
  showMomentControls,
}: {
  post: Post
  showMomentControls: boolean
}) {
  const lines = resolveMomentLines(post)
  const catalogLines = lines.filter(
    (line) => line.source !== 'external' && !!(line.songId && line.audioUrl),
  )
  const segments = computePlaybackSegments(postLinesToSegmentInput(catalogLines))
  const hasUnifiedPlay = showMomentControls && segments.length > 0 && catalogLines.length > 0
  const primaryCatalog = catalogLines[0]
  const combinedLyric = lines.map((l) => l.text.trim()).filter(Boolean).join('\n')
  const allSameSong =
    catalogLines.length > 0
    && catalogLines.every((l) => l.songId === catalogLines[0].songId)
  const showSongMetaOnce = allSameSong && catalogLines.some((l) => l.songTitle || l.artistName)

  const line = lines[0]
  const externalHref = !hasUnifiedPlay && lines.length === 1
    ? resolveExternalListenUrl({
      songTitle: line?.songTitle || post.knowledge?.song,
      artistName: line?.artistName || post.knowledge?.artist,
      youtubeUrl: post.youtubeMeta?.youtubeUrl,
    })
    : null
  const isExternalCard = !!externalHref && !hasUnifiedPlay

  const sharedMetaArtwork =
    primaryCatalog?.artworkUrl || post.knowledge?.artwork || null
  const sharedYoutubeThumb = !sharedMetaArtwork ? post.youtubeMeta?.thumbnail : undefined

  if (!showSongMetaOnce && !isExternalCard) return null

  const songId = primaryCatalog?.songId || post.songId

  return (
    <section className="margo-post-card__song-block" data-no-card-nav>
      {isExternalCard ? (
        <span className="margo-post-card__external-pill">
          <FeedIconExternal size={16} />
          External song · not on Margo
        </span>
      ) : null}
      <div className="margo-post-card__song-row">
        {(sharedMetaArtwork || sharedYoutubeThumb) ? (
          <PostThumbnail
            artwork={sharedMetaArtwork}
            youtubeThumbnail={sharedYoutubeThumb}
            alt=""
            loading="lazy"
            style={{
              width: `${FEED_ARTWORK_THUMB_PX}px`,
              height: `${FEED_ARTWORK_THUMB_PX}px`,
              borderRadius: '8px',
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid var(--border)',
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              width: `${FEED_ARTWORK_THUMB_PX}px`,
              height: `${FEED_ARTWORK_THUMB_PX}px`,
              borderRadius: '8px',
              flexShrink: 0,
              border: '1px solid var(--border)',
              background: 'linear-gradient(145deg, #2a2838, #15141c)',
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          {showSongMetaOnce && primaryCatalog ? (
            <SongMeta
              title={primaryCatalog.songTitle}
              artist={primaryCatalog.artistName}
              aiGenerated={primaryCatalog.isAiGenerated}
              href={primaryCatalog.songId ? `/song/${primaryCatalog.songId}` : null}
              titleStyle={{ fontSize: `var(${FEED_TYPE.songTitle})`, fontWeight: 600 }}
              artistStyle={{ fontSize: `var(${FEED_TYPE.artist})` }}
              aiLabelStyle={{ fontSize: 'var(--feed-type-ai-label)' }}
            />
          ) : isExternalCard ? (
            <SongMeta
              title={line?.songTitle || post.knowledge?.song}
              artist={line?.artistName || post.knowledge?.artist}
              titleStyle={{ fontSize: `var(${FEED_TYPE.songTitle})`, fontWeight: 600 }}
              artistStyle={{ fontSize: `var(${FEED_TYPE.artist})` }}
            />
          ) : null}
        </div>
        {hasUnifiedPlay && primaryCatalog ? (
          <MomentPlayControl
            postId={post.id}
            lines={lines}
            segments={segments}
            primaryLine={primaryCatalog}
            combinedLyric={combinedLyric}
          />
        ) : null}
      </div>
      {hasUnifiedPlay && primaryCatalog ? (
        <PostCardMomentMetaRow
          postId={post.id}
          lines={lines}
          segments={segments}
          primaryLine={primaryCatalog}
          combinedLyric={combinedLyric}
        />
      ) : null}
      {isExternalCard && externalHref ? (
        <a
          className="margo-post-card__listen-external"
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={externalListenAriaLabel(externalHref)}
          onClick={(e) => e.stopPropagation()}
        >
          <FeedIconExternal size={18} aria-hidden />
          Listen on Apple Music
        </a>
      ) : null}
      {hasUnifiedPlay && songId ? (
        <PendingNavLink
          href={`/song/${songId}`}
          className="margo-post-card__full-song-pill"
          indicator="tint"
          aria-label="Read along with full song lyrics"
          onClick={(e) => {
            e.stopPropagation()
            trackEvent('song_played', {
              mode: 'full',
              songId,
              source: 'feed-tier1',
            })
          }}
        >
          <span className="margo-post-card__full-song-pill-icons" aria-hidden>
            <FeedIconLyricsLines size={18} />
          </span>
          <span className="margo-post-card__full-song-pill-label">Read along · full song</span>
          <span className="margo-post-card__full-song-pill-icons" aria-hidden>
            <FeedIconChevronRight size={18} />
          </span>
        </PendingNavLink>
      ) : null}
    </section>
  )
}

/** Progress row aligned under song title (play control lives in song row). */
function PostCardMomentMetaRow({
  postId,
  lines,
  segments,
  primaryLine,
  combinedLyric,
}: {
  postId: string
  lines: PostLine[]
  segments: Array<{ startSec: number; endSec: number }>
  primaryLine: PostLine
  combinedLyric: string
}) {
  const songId = primaryLine.songId || null
  const totalSec = useMemo(() => sumSegmentDuration(segments), [segments])
  const { playing, buffering } = usePostMomentPlaybackUi(postId, songId)
  const { progressPct, elapsedSec } = usePostMomentPlaybackMetrics(postId, songId, totalSec)
  const displaySec = playing ? elapsedSec : totalSec
  const statusLabel = playing
    ? (buffering ? 'Loading moment' : 'Playing moment')
    : 'Play moment'

  return (
    <div className="margo-post-card__moment-meta">
      <span className="margo-post-card__moment-label">
        {statusLabel} · <strong>{formatMomentClock(displaySec)}</strong>
      </span>
      <div
        className="margo-post-card__progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(playing ? progressPct : 0)}
        aria-label={playing ? 'Moment playback progress' : 'Moment duration'}
      >
        <div
          className="margo-post-card__progress-fill"
          style={{ width: `${playing ? progressPct : 0}%` }}
        />
      </div>
    </div>
  )
}

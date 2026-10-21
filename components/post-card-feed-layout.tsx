'use client'

import { useState, useRef, useMemo } from 'react'
import type { Post } from '@/hooks/usePosts'
import type { PostLine } from '@/lib/post-lines'
import { resolveMomentLines } from '@/lib/post-lines'
import { FEED_ARTWORK_THUMB_PX } from '@/lib/feed/layout'
import { PostThumbnail } from '@/components/post-thumbnail'
import { SongMeta } from '@/components/song-meta'
import { FEED_TYPE } from '@/lib/fonts'
import {
  FEED_CARD_LYRIC_CLASS,
  FEED_CARD_LYRIC_CLAMP_CLASS,
} from '@/lib/post-card-lyric-class'
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
  feedLyricNeedsExpand,
  formatMomentClock,
  readLyricExpandedSession,
  sumSegmentDuration,
  writeLyricExpandedSession,
} from '@/lib/post-card-lyric-layout'
import { PendingNavLink } from '@/components/pending-nav-link'
import { trackEvent } from '@/lib/analytics/track'
import { FeedIconExternal, FeedIconLyricsLines, FeedMomentPlaybackIcon } from '@/components/feed-card-icons'

function externalProviderLabel(href: string): string {
  if (/music\.apple\.com/i.test(href)) return 'Apple Music'
  if (/spotify\.com/i.test(href)) return 'Spotify'
  if (/youtube\.com|youtu\.be/i.test(href)) return 'YouTube'
  return 'External'
}

function SongArtworkLink({
  href,
  artwork,
  youtubeThumbnail,
}: {
  href: string | null
  artwork: string | null
  youtubeThumbnail?: string
}) {
  const thumb = (
    <PostThumbnail
      artwork={artwork}
      youtubeThumbnail={youtubeThumbnail}
      alt=""
      loading="lazy"
      style={{
        width: `${FEED_ARTWORK_THUMB_PX}px`,
        height: `${FEED_ARTWORK_THUMB_PX}px`,
        borderRadius: '8px',
        objectFit: 'cover',
        flexShrink: 0,
        border: '1px solid var(--border)',
        display: 'block',
      }}
    />
  )
  const placeholder = (
    <div
      aria-hidden
      style={{
        width: `${FEED_ARTWORK_THUMB_PX}px`,
        height: `${FEED_ARTWORK_THUMB_PX}px`,
        borderRadius: '8px',
        flexShrink: 0,
        border: '1px solid var(--border)',
        background: 'linear-gradient(145deg, var(--surface-2), var(--surface-3))',
      }}
    />
  )
  const node = artwork || youtubeThumbnail ? thumb : placeholder
  if (!href) return node
  return (
    <PendingNavLink
      href={href}
      indicator="tint"
      aria-label="Open song"
      onClick={(e) => e.stopPropagation()}
      className="margo-post-card__song-art-link"
    >
      {node}
    </PendingNavLink>
  )
}

function MomentPlayCluster({
  postId,
  primaryLine,
  segments,
  combinedLyric,
}: {
  postId: string
  primaryLine: PostLine
  segments: Array<{ startSec: number; endSec: number }>
  combinedLyric: string
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const songId = primaryLine.songId || null
  const audioUrl = primaryLine.audioUrl || ''
  useWarmAudioUrlOnVisible(audioUrl, btnRef, true, segments[0]?.startSec ?? 0)
  const { playing, buffering } = usePostMomentPlaybackUi(postId, songId)
  const totalSec = useMemo(() => sumSegmentDuration(segments), [segments])
  const { elapsedSec } = usePostMomentPlaybackMetrics(postId, songId, totalSec)
  const displaySec = playing ? elapsedSec : totalSec
  const clock = formatMomentClock(displaySec)

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

  const ariaLabel = playing
    ? (buffering ? `Loading moment, ${clock}` : `Pause moment, ${clock}`)
    : `Play moment, ${clock}`

  return (
    <div className="margo-post-card__song-play-cluster">
      <span className="margo-post-card__moment-time" aria-hidden>
        {clock}
      </span>
      <button
        ref={btnRef}
        type="button"
        data-no-card-nav
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        aria-label={ariaLabel}
        className="margo-post-card__moment-btn"
      >
        <span className="margo-post-card__moment-btn-inner">
          <FeedMomentPlaybackIcon playing={playing} buffering={buffering} size={16} color="var(--bg)" />
        </span>
      </button>
    </div>
  )
}

function SongMomentProgress({
  postId,
  songId,
  segments,
}: {
  postId: string
  songId: string | null
  segments: Array<{ startSec: number; endSec: number }>
}) {
  const totalSec = useMemo(() => sumSegmentDuration(segments), [segments])
  const { playing } = usePostMomentPlaybackUi(postId, songId)
  const { progressPct } = usePostMomentPlaybackMetrics(postId, songId, totalSec)
  return (
    <div
      className="margo-post-card__song-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(playing ? progressPct : 0)}
      aria-label={playing ? 'Moment playback progress' : 'Moment duration'}
    >
      <div
        className="margo-post-card__song-progress-fill"
        style={{ width: `${playing ? progressPct : 0}%` }}
      />
    </div>
  )
}

export function PostCardLyricSection({ post }: { post: Post }) {
  const lines = resolveMomentLines(post)
  const multi = lines.length > 1
  const [expanded, setExpanded] = useState(() => readLyricExpandedSession(post.id))

  const setExpandedPersist = (next: boolean) => {
    setExpanded(next)
    writeLyricExpandedSession(post.id, next)
  }

  if (multi) {
    const combined = lines.map((l) => l.text.trim()).filter(Boolean).join('\n\n')
    const needsExpand = feedLyricNeedsExpand(combined)
    return (
      <div className="margo-post-card__lyric-zone">
        {!expanded && needsExpand ? (
          <p className={FEED_CARD_LYRIC_CLAMP_CLASS}>
            {lines.map((line, i) => (
              <span key={line.id || `line-${line.position}-${i}`}>
                {i > 0 ? (
                  <span className="margo-feed-stitch margo-post-card__stitch" aria-hidden> stitch </span>
                ) : null}
                &ldquo;{line.text}&rdquo;
              </span>
            ))}
          </p>
        ) : (
          lines.map((line, i) => (
            <div key={line.id || `line-${line.position}-${i}`}>
              {i > 0 ? (
                <p className="margo-feed-stitch margo-post-card__stitch" aria-hidden>stitch</p>
              ) : null}
              <p className={FEED_CARD_LYRIC_CLASS}>&ldquo;{line.text}&rdquo;</p>
            </div>
          ))
        )}
        {needsExpand ? (
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

  const text = lines[0]?.text || post.text || ''
  const needsExpand = feedLyricNeedsExpand(text)

  return (
    <div className="margo-post-card__lyric-zone">
      <p
        className={needsExpand && !expanded ? FEED_CARD_LYRIC_CLAMP_CLASS : FEED_CARD_LYRIC_CLASS}
      >
        &ldquo;{text}&rdquo;
      </p>
      {needsExpand ? (
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
  const songHref = songId ? `/song/${songId}` : null
  const provider = externalHref ? externalProviderLabel(externalHref) : null
  const externalArtist = (line?.artistName || post.knowledge?.artist || '').trim()
  const externalTitle = (line?.songTitle || post.knowledge?.song || '').trim()

  return (
    <section className="margo-post-card__song-block" data-no-card-nav>
      <div className="margo-post-card__song-row-shell">
        <div className="margo-post-card__song-row">
          <SongArtworkLink
            href={isExternalCard ? null : songHref}
            artwork={sharedMetaArtwork}
            youtubeThumbnail={sharedYoutubeThumb ?? undefined}
          />
          <div className="margo-post-card__song-meta">
            {showSongMetaOnce && primaryCatalog ? (
              <SongMeta
                className="margo-song-meta--feed-row"
                title={primaryCatalog.songTitle}
                artist={primaryCatalog.artistName}
                aiGenerated={primaryCatalog.isAiGenerated}
                href={songHref}
                titleStyle={{ fontSize: `var(${FEED_TYPE.songTitle})`, fontWeight: 600 }}
                artistStyle={{ fontSize: `var(${FEED_TYPE.artist})`, color: 'var(--text-muted)' }}
              />
            ) : isExternalCard ? (
              <div className="margo-post-card__external-meta">
                {externalTitle ? (
                  <p className="margo-post-card__external-title">{externalTitle}</p>
                ) : null}
                <p className="margo-post-card__external-source">
                  <span className="margo-post-card__external-source-text">
                    {externalArtist ? `${externalArtist} · ` : null}
                    {provider}
                  </span>
                  <FeedIconExternal size={12} aria-hidden />
                </p>
              </div>
            ) : null}
          </div>
          {hasUnifiedPlay && primaryCatalog ? (
            <MomentPlayCluster
              postId={post.id}
              primaryLine={primaryCatalog}
              segments={segments}
              combinedLyric={combinedLyric}
            />
          ) : null}
          {isExternalCard && externalHref ? (
            <a
              className="margo-post-card__external-open"
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={externalListenAriaLabel(externalHref) || 'Open in Apple Music'}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="margo-post-card__external-open-inner">
                <FeedIconExternal size={16} />
              </span>
            </a>
          ) : null}
        </div>
        {hasUnifiedPlay && primaryCatalog ? (
          <SongMomentProgress
            postId={post.id}
            songId={primaryCatalog.songId || null}
            segments={segments}
          />
        ) : null}
      </div>
      {hasUnifiedPlay && songId ? (
        <div className="margo-post-card__song-util">
          <PendingNavLink
            href={`/song/${songId}`}
            className="margo-post-card__read-along-chip"
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
            <FeedIconLyricsLines size={14} aria-hidden />
            <span>Read along ›</span>
          </PendingNavLink>
        </div>
      ) : null}
    </section>
  )
}

'use client'

import { playSnippet, togglePlayPause, type SnippetPlaybackSource } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { FeedIconExternal, FeedMomentPlaybackIcon } from '@/components/feed-card-icons'
import {
  externalListenAriaLabel,
  resolveExternalListenUrl,
} from '@/lib/moment/listen'

export type LyricBackTrackListenControlProps = {
  songId?: string | null
  audioUrl?: string | null
  songTitle?: string | null
  artistName?: string | null
  externalListenUrl?: string | null
  lineIndex?: number
  lineText?: string
  startSec?: number | null
  endSec?: number | null
  artwork?: string | null
  /** Snippet playback source tag for analytics/engine. */
  source?: SnippetPlaybackSource
  className?: string
  /** Suggestion rows use feed vibe play chrome instead of thread snippet chrome. */
  visual?: 'thread' | 'feed-row'
}

export function LyricBackTrackListenControl({
  songId,
  audioUrl,
  songTitle,
  artistName,
  externalListenUrl,
  lineIndex = 0,
  lineText = '',
  startSec,
  endSec,
  artwork,
  source = 'feed',
  className = 'margo-lb-thread-row__snippet-btn',
  visual = 'thread',
}: LyricBackTrackListenControlProps) {
  const innerClass =
    visual === 'feed-row'
      ? 'margo-post-card__lb-row-play-inner'
      : 'margo-lb-thread-row__snippet-btn-inner'
  const externalInnerClass =
    visual === 'feed-row'
      ? 'margo-post-card__lb-row-play-inner'
      : 'margo-lb-thread-row__snippet-btn-inner margo-lb-thread-row__snippet-btn-inner--external'
  const engine = useAudioEngine()
  const canPlay = Boolean(audioUrl && songId)
  const externalHref = !canPlay
    ? resolveExternalListenUrl({
        songTitle,
        artistName,
        itunesTrackUrl: externalListenUrl,
      })
    : null

  const isPlaying =
    canPlay
    && engine.playing
    && engine.mode === 'snippet'
    && engine.songId === songId
    && (lineIndex != null
      ? engine.snippet?.lineIndex === lineIndex
      : startSec != null && Math.abs((engine.snippet?.startSec ?? 0) - startSec) < 0.5)

  if (!canPlay && !externalHref) return null

  if (canPlay) {
    return (
      <button
        type="button"
        className={className}
        aria-label={isPlaying ? 'Pause line' : 'Play line'}
        onClick={(e) => {
          e.stopPropagation()
          if (isPlaying) {
            togglePlayPause()
            return
          }
          if (!audioUrl || !songId) return
          void playSnippet({
            songId,
            audioUrl,
            title: songTitle || '',
            artist: artistName || '',
            artwork: artwork ?? null,
            lineIndex,
            lineText,
            startSec: startSec ?? 0,
            endSec: endSec ?? (startSec ?? 0) + 8,
            source,
          })
        }}
      >
        <span className={innerClass}>
          <FeedMomentPlaybackIcon
            playing={isPlaying}
            size={16}
            color={visual === 'feed-row' ? 'var(--post-vibe-fill)' : 'var(--bg)'}
          />
        </span>
      </button>
    )
  }

  return (
    <a
      className={`${className} margo-lb-thread-row__snippet-btn--external`}
      href={externalHref!}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={externalListenAriaLabel(externalHref!) || 'Open in music app'}
      onClick={(e) => e.stopPropagation()}
    >
      <span className={externalInnerClass}>
        <FeedIconExternal size={16} />
      </span>
    </a>
  )
}

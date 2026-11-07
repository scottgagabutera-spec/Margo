'use client'

import type { ReactNode } from 'react'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { useIsBuffering, useIsPlaying } from '@/hooks/useAudioEngine'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'

const font = UI_FONT
const lyricFont = LYRIC_FONT

export type ProfileSignatureTrack = {
  id: string
  title: string
  artist: string
  artwork: string | null
  audioUrl: string
  lineIndex: number
  lineText: string
  startSec: number
  endSec: number
}

type PillPlayProps = {
  track: ProfileSignatureTrack
  size?: 'pill' | 'sheet'
}

function SignaturePillPlayRing({ track, size = 'pill' }: PillPlayProps) {
  const playing = useIsPlaying(track.id)
  const buffering = useIsBuffering(track.id)
  const iconSize = size === 'sheet' ? 16 : 15
  return (
    <button
      type="button"
      className={size === 'sheet' ? 'margo-profile-signature-pill__play margo-profile-signature-pill__play--sheet' : 'margo-profile-signature-pill__play'}
      aria-label={playing ? 'Pause signature' : 'Play signature'}
      onClick={(e) => {
        e.stopPropagation()
        if (playing) {
          togglePlayPause()
          return
        }
        void playSnippet({
          songId: track.id,
          audioUrl: track.audioUrl,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          lineIndex: track.lineIndex ?? 0,
          lineText: track.lineText || '',
          startSec: track.startSec,
          endSec: track.endSec,
          source: 'feed',
        })
      }}
    >
      <PlayPauseIcon playing={playing} buffering={buffering} size={iconSize} color="rgba(240, 244, 252, 0.95)" />
    </button>
  )
}

export function ProfileSignaturePill({
  lyric,
  songTitle,
  artistName,
  track,
  onOpenLyric,
  longPressHandlers,
  isOwner,
}: {
  lyric: string
  songTitle?: string | null
  artistName?: string | null
  track: ProfileSignatureTrack | null
  onOpenLyric: () => void
  longPressHandlers?: Record<string, unknown>
  isOwner?: boolean
}) {
  const artworkSrc = track?.artwork ? compactArtworkUrl(track.artwork, 92) : null
  const title = (songTitle || track?.title || '').trim()
  const artist = (artistName || track?.artist || '').trim()
  const showMeta = !!(title || artist)
  const excerpt = lyric.trim()

  return (
    <div
      className="margo-profile-signature-pill-wrap"
      {...(isOwner && longPressHandlers ? longPressHandlers : {})}
    >
      <button
        type="button"
        className="margo-profile-signature-pill"
        onClick={() => {
          onOpenLyric()
        }}
        aria-label="Signature lyric. Tap for the full lyric."
      >
        {artworkSrc ? (
          <img
            className="margo-profile-signature-pill__art"
            src={artworkSrc}
            alt=""
            width={46}
            height={46}
          />
        ) : (
          <span className="margo-profile-signature-pill__art margo-profile-signature-pill__art--empty" aria-hidden />
        )}
        <span className="margo-profile-signature-pill__copy">
          <span className="margo-profile-signature-pill__lyric">
            &ldquo;{excerpt}&rdquo;
          </span>
          {showMeta ? (
            <span className="margo-profile-signature-pill__meta">
              {title ? <span className="margo-profile-signature-pill__meta-title">{title}</span> : null}
              {title && artist ? <span className="margo-profile-signature-pill__meta-dot"> · </span> : null}
              {artist ? <span className="margo-profile-signature-pill__meta-artist">{artist}</span> : null}
            </span>
          ) : null}
        </span>
        {track ? <SignaturePillPlayRing track={track} /> : null}
      </button>
      {isOwner ? (
        <p className="margo-profile-signature-pill__hold-hint">Hold for options</p>
      ) : null}
    </div>
  )
}

export function ProfileSignatureLyricSheet({
  open,
  onOpenChange,
  lyric,
  song,
  artist,
  track,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric: string
  song?: string | null
  artist?: string | null
  track: ProfileSignatureTrack | null
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="margo-profile-signature-sheet-backdrop"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="margo-profile-signature-sheet"
        role="dialog"
        aria-labelledby="profile-signature-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="profile-signature-sheet-title" className="margo-profile-signature-sheet__label">
          Signature
        </p>
        <p className="margo-profile-signature-sheet__lyric">&ldquo;{lyric}&rdquo;</p>
        {(song || artist || track) && (
          <div className="margo-profile-signature-sheet__track-row">
            {track ? <SignaturePillPlayRing track={track} size="sheet" /> : null}
            <p className="margo-profile-signature-sheet__meta">
              {song}
              {song && artist ? ' · ' : ''}
              {artist}
            </p>
          </div>
        )}
        {footer}
        <button
          type="button"
          className="margo-profile-signature-sheet__close"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </div>
    </div>
  )
}

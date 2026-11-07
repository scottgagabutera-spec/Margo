'use client'

import type { ReactNode } from 'react'
import { UI_FONT, LYRIC_FONT, TYPE } from '@/lib/fonts'
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
}

function SignaturePillPlayRing({ track }: PillPlayProps) {
  const playing = useIsPlaying(track.id)
  const buffering = useIsBuffering(track.id)
  return (
    <button
      type="button"
      className="margo-profile-signature-pill__play"
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
      <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--silver-text)" />
    </button>
  )
}

export function ProfileSignaturePill({
  lyric,
  track,
  onOpenLyric,
  longPressHandlers,
  isOwner,
}: {
  lyric: string
  track: ProfileSignatureTrack | null
  onOpenLyric: () => void
  longPressHandlers?: Record<string, unknown>
  isOwner?: boolean
}) {
  const artwork = track?.artwork ? compactArtworkUrl(track.artwork, 48) : null
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
        aria-label="Signature lyric. Tap to read the full line."
      >
        {artwork ? (
          <img
            className="margo-profile-signature-pill__art"
            src={artwork}
            alt=""
            width={36}
            height={36}
          />
        ) : (
          <span className="margo-profile-signature-pill__art margo-profile-signature-pill__art--empty" aria-hidden />
        )}
        <span
          className="margo-profile-signature-pill__text"
          style={{ fontFamily: lyricFont, fontStyle: 'italic', fontSize: TYPE.secondary }}
        >
          &ldquo;{excerpt}&rdquo;
        </span>
        {track ? <SignaturePillPlayRing track={track} /> : null}
      </button>
      {isOwner ? (
        <p
          style={{
            fontFamily: font,
            fontSize: TYPE.label,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            margin: '8px 0 0',
            textAlign: 'center',
          }}
        >
          Hold for options
        </p>
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
        <p id="profile-signature-sheet-title" style={{ ...sectionLabel(), marginBottom: '12px' }}>
          Signature
        </p>
        <p
          style={{
            fontFamily: lyricFont,
            fontStyle: 'italic',
            fontSize: TYPE.lyric,
            color: 'var(--text)',
            lineHeight: 1.55,
            margin: '0 0 16px',
          }}
        >
          &ldquo;{lyric}&rdquo;
        </p>
        {(song || artist || track) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {track ? (
              <SignaturePillPlayRing track={track} />
            ) : null}
            <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-secondary)', margin: 0 }}>
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

function sectionLabel(): React.CSSProperties {
  return {
    fontFamily: font,
    fontSize: TYPE.label,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    margin: 0,
  }
}

'use client'

import { CloseIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { UI_FONT } from '@/lib/fonts'

interface StageSongChipProps {
  title: string
  artist: string
  artwork?: string | null
  onClear: () => void
  subtitle?: string | null
  onPlay?: () => void
  playing?: boolean
  buffering?: boolean
  variant?: 'pill' | 'calm'
}

export function StageSongChip({
  title,
  artist,
  artwork,
  onClear,
  subtitle,
  onPlay,
  playing = false,
  buffering = false,
  variant = 'pill',
}: StageSongChipProps) {
  const calm = variant === 'calm'
  return (
    <div
      className={calm ? 'margo-stage-song-chip margo-stage-song-chip--calm' : 'margo-stage-song-chip'}
      style={calm ? undefined : {
        position: 'relative',
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '100%',
        padding: '6px 10px 6px 6px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '50px',
        boxSizing: 'border-box',
      }}
    >
      {artwork ? (
        <img
          src={artwork}
          alt=""
          style={
            calm
              ? { width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }
              : { width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }
          }
        />
      ) : (
        <div
          className={calm ? 'margo-stage-song-chip__art-placeholder' : undefined}
          style={
            calm
              ? { width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0, background: 'var(--surface-2)' }
              : { width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0, background: 'var(--surface-2)' }
          }
        />
      )}
      <div className="margo-stage-song-chip__copy" style={{ minWidth: 0, flex: 1 }}>
        <span
          className="margo-stage-song-chip__title"
          style={calm ? undefined : {
            fontFamily: UI_FONT,
            fontSize: '13px',
            color: 'var(--text)',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {title}
          <span className="margo-stage-song-chip__artist"> · {artist}</span>
        </span>
        {calm && subtitle ? (
          <span className="margo-stage-song-chip__subtitle" style={{ fontFamily: UI_FONT }}>
            {subtitle}
          </span>
        ) : null}
      </div>
      {calm && onPlay ? (
        <button
          type="button"
          className="margo-stage-song-chip__play"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
        >
          <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--bg)" />
        </button>
      ) : null}
      <button
        type="button"
        className={calm ? 'margo-stage-song-chip__clear' : undefined}
        aria-label="Clear song"
        onClick={(e) => {
          e.stopPropagation()
          onClear()
        }}
        style={calm ? undefined : {
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          margin: '-6px -8px -6px 0',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          color: 'var(--gold)',
          position: 'relative',
          zIndex: 3,
          touchAction: 'manipulation',
        }}
      >
        <span
          aria-hidden
          className="margo-stage-song-chip__clear-disc"
          style={calm ? undefined : {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid var(--gold-border)',
            background: 'var(--gold-faint)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CloseIcon size={calm ? 12 : 14} color="var(--gold)" />
        </span>
      </button>
    </div>
  )
}

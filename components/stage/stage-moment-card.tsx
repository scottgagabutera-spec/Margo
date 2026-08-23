'use client'

import type { CSSProperties } from 'react'
import { ComposeLyricCard, composeLyricTextStyle } from '@/components/compose-lyric-card'
import { SongMeta } from '@/components/song-meta'
import { VibeTag } from '@/components/vibe-tag'
import { MargoSymbol } from '@/components/margo-symbol'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { UI_FONT } from '@/lib/fonts'

interface StageMomentCardProps {
  lyric: string
  songTitle: string
  artistName: string
  artwork?: string | null
  vibeLabel?: string | null
  canPlay: boolean
  playing?: boolean
  buffering?: boolean
  onPlay?: () => void
  listenUrl?: string | null
  style?: CSSProperties
}

/**
 * Gold Moment for The Stage — lyric-dominant, not a Feed post.
 */
export function StageMomentCard({
  lyric,
  songTitle,
  artistName,
  artwork,
  vibeLabel,
  canPlay,
  playing = false,
  buffering = false,
  onPlay,
  listenUrl,
  style,
}: StageMomentCardProps) {
  return (
    <ComposeLyricCard style={{ textAlign: 'left', ...style }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
        {artwork ? (
          <img
            src={artwork}
            alt=""
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '10px',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ ...composeLyricTextStyle, fontSize: 'clamp(1.25rem, 4.5vw, 1.65rem)' }}>
            &ldquo;{lyric}&rdquo;
          </p>
        </div>
      </div>

      <div style={{ marginTop: '4px' }}>
        <SongMeta
          title={songTitle}
          artist={artistName}
          titleStyle={{ color: 'var(--text-on-gold)', fontSize: '0.85rem' }}
          artistStyle={{ color: 'var(--text-on-gold-muted)', fontSize: '0.72rem' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', gap: '12px' }}>
        {canPlay ? (
          <button
            type="button"
            onClick={onPlay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: 'var(--margo-touch-min)',
              padding: '0 16px',
              background: 'rgba(7,6,10,0.12)',
              border: '1px solid rgba(7,6,10,0.16)',
              borderRadius: '50px',
              cursor: 'pointer',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: 'var(--text-on-gold)',
            }}
          >
            <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--text-on-gold)" />
            {playing ? 'Pause' : 'Play'}
          </button>
        ) : listenUrl ? (
          <a
            href={listenUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: 'var(--margo-touch-min)',
              padding: '0 16px',
              background: 'rgba(7,6,10,0.12)',
              border: '1px solid rgba(7,6,10,0.16)',
              borderRadius: '50px',
              textDecoration: 'none',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: 'var(--text-on-gold)',
            }}
          >
            Listen ↗
          </a>
        ) : (
          <span />
        )}
        <MargoSymbol size={22} variant="ink" style={{ opacity: 0.35 }} />
      </div>

      {vibeLabel ? (
        <div style={{ position: 'relative', height: '22px', marginTop: '14px' }}>
          <VibeTag label={vibeLabel} color="var(--text-on-gold)" variant="dark" />
        </div>
      ) : null}
    </ComposeLyricCard>
  )
}

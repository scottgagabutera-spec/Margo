'use client'

import type { CSSProperties } from 'react'
import { ComposeLyricCard } from '@/components/compose-lyric-card'
import { VibeTag } from '@/components/vibe-tag'
import { MargoSymbol } from '@/components/margo-symbol'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'

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

const playControlStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  background: 'rgba(7,6,10,0.1)',
  border: '1px solid rgba(7,6,10,0.14)',
  flexShrink: 0,
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
  const metaLine = [songTitle, artistName].filter(Boolean).join(' · ')

  return (
    <ComposeLyricCard
      style={{
        textAlign: 'left',
        borderRadius: '16px',
        padding: '20px 20px 18px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 28%), var(--gold)',
        ...style,
      }}
    >
      <p
        style={{
          fontFamily: LYRIC_FONT,
          fontStyle: 'italic',
          fontSize: 'clamp(1.35rem, 4.8vw, 1.85rem)',
          color: 'var(--text-on-gold)',
          lineHeight: 1.35,
          margin: 0,
          textAlign: 'left',
        }}
      >
        {lyric}
      </p>

      {metaLine ? (
        <p
          style={{
            margin: '14px 0 0',
            fontFamily: UI_FONT,
            fontSize: '0.75rem',
            fontWeight: 400,
            color: 'var(--text-on-gold-muted)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {metaLine}
        </p>
      ) : null}

      {artwork ? (
        <img
          src={artwork}
          alt=""
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            objectFit: 'cover',
            marginTop: '14px',
            display: 'block',
          }}
        />
      ) : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
          gap: '12px',
        }}
      >
        {canPlay ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label={playing ? 'Pause' : 'Play'}
            style={{
              ...playControlStyle,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <PlayPauseIcon playing={playing} buffering={buffering} size={14} color="var(--text-on-gold)" />
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
              padding: '0 4px',
              textDecoration: 'none',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.2px',
              color: 'var(--text-on-gold)',
            }}
          >
            Listen ↗
          </a>
        ) : (
          <span />
        )}
        <MargoSymbol size={20} variant="ink" style={{ opacity: 0.32 }} />
      </div>

      {vibeLabel ? (
        <div style={{ position: 'relative', height: '22px', marginTop: '12px' }}>
          <VibeTag label={vibeLabel} color="var(--text-on-gold)" variant="on-gold" />
        </div>
      ) : null}
    </ComposeLyricCard>
  )
}

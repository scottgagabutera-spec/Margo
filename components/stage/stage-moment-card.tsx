'use client'

import { useState } from 'react'
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
  /** AI-suggested vibe — shows a dot on that option in the picker */
  suggestedVibeLabel?: string | null
  vibeOptions?: string[]
  onVibeSelect?: (label: string) => void
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

const markBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  background: 'rgba(7,6,10,0.1)',
  border: '1px solid rgba(7,6,10,0.16)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.22) inset',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
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
  suggestedVibeLabel,
  vibeOptions = [],
  onVibeSelect,
  canPlay,
  playing = false,
  buffering = false,
  onPlay,
  listenUrl,
  style,
}: StageMomentCardProps) {
  const [vibePickerOpen, setVibePickerOpen] = useState(false)
  const metaLine = [songTitle, artistName].filter(Boolean).join(' · ')
  const canPickVibe = vibeOptions.length > 0 && !!onVibeSelect

  return (
    <ComposeLyricCard
      style={{
        position: 'relative',
        textAlign: 'left',
        borderRadius: '16px',
        padding: '20px 20px 18px',
        paddingRight: '52px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 28%), var(--gold)',
        ...style,
      }}
    >
      <div style={markBadgeStyle} aria-hidden>
        <MargoSymbol size={22} variant="ink" />
      </div>

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
          marginTop: '16px',
          gap: '12px',
          minHeight: 'var(--margo-touch-min)',
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
        ) : null}
      </div>

      {vibeLabel ? (
        <div style={{ position: 'relative', height: vibePickerOpen ? 'auto' : '22px', marginTop: '12px' }}>
          <VibeTag
            label={vibeLabel}
            color="var(--text-on-gold)"
            variant="on-gold"
            onClick={canPickVibe ? () => setVibePickerOpen((open) => !open) : undefined}
          />
          {vibePickerOpen && canPickVibe ? (
            <div
              role="listbox"
              aria-label="Choose a vibe"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '14px',
                paddingBottom: '4px',
              }}
            >
              {vibeOptions.map((option) => {
                const selected = option === vibeLabel
                const suggested = option === suggestedVibeLabel && !selected
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onVibeSelect?.(option)
                      setVibePickerOpen(false)
                    }}
                    style={{
                      position: 'relative',
                      minHeight: '32px',
                      padding: '0 12px',
                      borderRadius: '50px',
                      border: selected
                        ? '1px solid rgba(7,6,10,0.35)'
                        : '1px solid rgba(7,6,10,0.16)',
                      background: selected ? 'rgba(7,6,10,0.14)' : 'rgba(7,6,10,0.06)',
                      color: 'var(--text-on-gold)',
                      fontFamily: UI_FONT,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {option}
                    {suggested ? (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--text-on-gold)',
                          border: '1.5px solid var(--gold)',
                        }}
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </ComposeLyricCard>
  )
}

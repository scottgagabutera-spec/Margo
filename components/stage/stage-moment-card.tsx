'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ComposeLyricCard } from '@/components/compose-lyric-card'
import { MargoSymbol } from '@/components/margo-symbol'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import {
  cycleStageCardTheme,
  getStageCardTheme,
  type StageCardThemeId,
} from '@/lib/moment/stage-theme'

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
  cardThemeId?: StageCardThemeId
  onThemeChange?: (id: StageCardThemeId) => void
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
  flexShrink: 0,
}

function footerLabelStyle(inkMuted: string): CSSProperties {
  return {
    fontFamily: UI_FONT,
    fontSize: '0.56rem',
    fontWeight: 600,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: inkMuted,
    lineHeight: 1,
    flexShrink: 0,
  }
}

function footerChipStyle(theme: ReturnType<typeof getStageCardTheme>): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '22px',
    maxWidth: '88px',
    padding: '0 10px',
    borderRadius: '50px',
    border: `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.18)' : 'rgba(255,255,255,0.2)'}`,
    background: theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.08)' : 'rgba(255,255,255,0.1)',
    fontFamily: UI_FONT,
    fontSize: '0.56rem',
    fontWeight: 700,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    color: theme.ink,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flexShrink: 1,
    minWidth: 0,
  }
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
  cardThemeId = 'gold',
  onThemeChange,
  canPlay,
  playing = false,
  buffering = false,
  onPlay,
  listenUrl,
  style,
}: StageMomentCardProps) {
  const [vibePickerOpen, setVibePickerOpen] = useState(false)
  const theme = getStageCardTheme(cardThemeId)
  const canPickVibe = vibeOptions.length > 0 && !!onVibeSelect
  const canCycleTheme = !!onThemeChange
  const markVariant = theme.markVariant === 'on-light' ? 'ink' : 'gold'
  const showFooter = vibeLabel || canCycleTheme

  return (
    <ComposeLyricCard
      style={{
        position: 'relative',
        textAlign: 'left',
        borderRadius: '16px',
        padding: '20px 20px 18px',
        paddingRight: '52px',
        background: `linear-gradient(180deg, ${theme.markVariant === 'on-light' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)'} 0%, transparent 28%), ${theme.bg}`,
        border: `1px solid ${theme.border}`,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: theme.badgeFill,
          border: `1px solid ${theme.badgeStroke}`,
          boxShadow: theme.markVariant === 'on-light'
            ? '0 1px 0 rgba(255,255,255,0.22) inset'
            : '0 1px 0 rgba(255,255,255,0.08) inset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <MargoSymbol size={22} variant={markVariant} />
      </div>

      <p
        style={{
          fontFamily: LYRIC_FONT,
          fontStyle: 'italic',
          fontSize: 'clamp(1.35rem, 4.8vw, 1.85rem)',
          color: theme.ink,
          lineHeight: 1.35,
          margin: 0,
          textAlign: 'left',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {lyric}
      </p>

      {(songTitle || artistName) ? (
        <div style={{ marginTop: '14px', minWidth: 0 }}>
          {songTitle ? (
            <p
              style={{
                margin: 0,
                fontFamily: UI_FONT,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: theme.ink,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {songTitle}
            </p>
          ) : null}
          {artistName ? (
            <p
              style={{
                margin: songTitle ? '3px 0 0' : 0,
                fontFamily: UI_FONT,
                fontSize: '0.72rem',
                fontWeight: 400,
                color: theme.inkMuted,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {artistName}
            </p>
          ) : null}
        </div>
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

      {(canPlay || listenUrl) ? (
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
                background: theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.1)' : 'rgba(255,255,255,0.12)',
                border: `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.14)' : 'rgba(255,255,255,0.16)'}`,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <PlayPauseIcon playing={playing} buffering={buffering} size={14} color={theme.ink} />
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
                color: theme.ink,
              }}
            >
              Listen ↗
            </a>
          ) : null}
        </div>
      ) : null}

      {showFooter ? (
        <div style={{ marginTop: '16px' }}>
          {vibePickerOpen && canPickVibe ? (
            <div
              role="listbox"
              aria-label="Choose a vibe"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                gap: '6px',
                marginBottom: '14px',
                width: '100%',
                paddingBottom: '2px',
                borderBottom: `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.1)' : 'rgba(255,255,255,0.1)'}`,
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
                      minHeight: '26px',
                      padding: '0 4px',
                      borderRadius: '50px',
                      border: selected
                        ? `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.35)' : 'rgba(255,255,255,0.35)'}`
                        : `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.16)' : 'rgba(255,255,255,0.16)'}`,
                      background: selected
                        ? (theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.14)' : 'rgba(255,255,255,0.14)')
                        : (theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.06)' : 'rgba(255,255,255,0.06)'),
                      color: theme.ink,
                      fontFamily: UI_FONT,
                      fontSize: '0.58rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {option}
                    {suggested ? (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          top: '-3px',
                          right: '-3px',
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: theme.ink,
                          border: `1.5px solid ${theme.bg}`,
                        }}
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '16px',
              minHeight: '22px',
            }}
          >
            {canCycleTheme ? (
              <button
                type="button"
                aria-label={`Color: ${theme.label}. Tap to change.`}
                onClick={() => onThemeChange?.(cycleStageCardTheme(cardThemeId).id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  flexShrink: 0,
                }}
              >
                <span style={footerLabelStyle(theme.inkMuted)}>Color</span>
                <span
                  aria-hidden
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    border: `2px solid ${theme.ink}`,
                    background: theme.swatch,
                    boxShadow: theme.markVariant === 'on-light'
                      ? 'inset 0 0 0 1.5px rgba(255,255,255,0.55)'
                      : 'inset 0 0 0 1.5px rgba(255,255,255,0.14)',
                    flexShrink: 0,
                  }}
                />
              </button>
            ) : null}

            {vibeLabel ? (
              <button
                type="button"
                aria-label={canPickVibe ? `Vibe: ${vibeLabel}. Tap to change.` : `Vibe: ${vibeLabel}`}
                onClick={canPickVibe ? () => setVibePickerOpen((open) => !open) : undefined}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: canPickVibe ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                  flexShrink: 0,
                  maxWidth: '100%',
                  minWidth: 0,
                }}
              >
                <span style={footerLabelStyle(theme.inkMuted)}>Vibe</span>
                <span style={footerChipStyle(theme)} title={vibeLabel}>
                  {vibeLabel}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </ComposeLyricCard>
  )
}

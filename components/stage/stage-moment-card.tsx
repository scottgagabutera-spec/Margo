'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ComposeLyricCard } from '@/components/compose-lyric-card'
import { MargoSymbol } from '@/components/margo-symbol'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { ShareIcon } from '@/components/icons'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import {
  lyricDisplayText,
  lyricLineOffset,
  stageCardLyricStyle,
  stageCardMarkStyle,
  useStageCardLayout,
} from '@/hooks/useStageCardLayout'
import { AtmospherePreviewRoom } from '@/components/atmosphere-layer'
import { isLivingAtmosphere, type AtmosphereId } from '@/lib/atmosphere'
import { resolveExportPaintTheme, type StageCardTheme, type StageCardThemeId } from '@/lib/moment/stage-theme'
import type { MomentShapeId } from '@/lib/moment/types'

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
  /**
   * Atmosphere overlay on the card.
   * Platform preview: pass the song's assigned atmosphere.
   * Export preview: pass the user's export effect choice.
   */
  atmosphereId?: AtmosphereId
  /** Export size — Shorts uses a native 9:16 layout instead of a feed card on a stage. */
  shapeId?: MomentShapeId
  canPlay: boolean
  playing?: boolean
  buffering?: boolean
  onPlay?: () => void
  listenUrl?: string | null
  /** When true, Vibe chrome is rendered by the parent (never inside a 9:16 clip). */
  hideVibeChrome?: boolean
  /**
   * Export customize: a living Effect replaces Color (platform room).
   * Off for compose/platform preview, where Color is not a user control.
   */
  effectOwnsFill?: boolean
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

function footerChipStyle(theme: StageCardTheme): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '22px',
    maxWidth: '100%',
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
 * Export customization (Color / Effect / Size) lives in MomentExportCustomizeBar.
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
  atmosphereId = 'still',
  shapeId = 'square',
  canPlay,
  playing = false,
  buffering = false,
  onPlay,
  listenUrl,
  hideVibeChrome = false,
  effectOwnsFill = false,
  style,
}: StageMomentCardProps) {
  const [vibePickerOpen, setVibePickerOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardWidth, setCardWidth] = useState<number | null>(null)
  const theme = resolveExportPaintTheme(cardThemeId, effectOwnsFill ? atmosphereId : 'still')
  const canPickVibe = vibeOptions.length > 0 && !!onVibeSelect
  const markVariant = theme.markVariant === 'on-light' ? 'ink' : 'gold'
  const showAtmosphere = isLivingAtmosphere(atmosphereId)
  const isShorts = shapeId === 'vertical'
  const showVibeFooter = !hideVibeChrome && !isShorts && !!vibeLabel

  const layout = useStageCardLayout({
    lyric,
    songTitle,
    artistName,
    artworkUrl: artwork,
    vibeLabel,
    themeId: cardThemeId,
    includeVibePill: false,
    format: isShorts ? 'shorts' : 'feed',
    exportAtmosphereId: effectOwnsFill ? atmosphereId : 'still',
  }, cardWidth)

  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setCardWidth(w)
    })
    ro.observe(el)
    setCardWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const shellPadding = layout
    ? isShorts
      ? {
          padding: 0,
          borderRadius: 0,
          height: '100%',
          minHeight: '100%',
        }
      : {
          paddingTop: layout.padding.top,
          paddingRight: layout.padding.right,
          paddingBottom: layout.padding.bottom,
          paddingLeft: layout.padding.left,
          borderRadius: layout.borderRadius,
          minHeight: layout.outputHeight,
        }
    : {
        padding: isShorts ? 0 : '20px 52px 18px 20px',
        borderRadius: isShorts ? 0 : '16px',
        minHeight: undefined as number | undefined,
        height: isShorts ? '100%' : undefined,
      }

  const shellStyle: CSSProperties = {
    position: 'relative',
    textAlign: 'left',
    overflow: 'hidden',
    isolation: 'isolate',
    border: `1px solid ${theme.border}`,
    boxSizing: 'border-box',
    background: theme.bg,
    transition: 'background 200ms var(--ease-out), border-color 200ms var(--ease-out)',
    ...shellPadding,
    ...style,
  }

  const fillLayerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    zIndex: 0,
    background: layout ? layout.background.base : theme.bg,
  }

  const highlightLayerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    zIndex: 1,
    pointerEvents: 'none',
    background: layout
      ? `linear-gradient(180deg, rgba(255,255,255,${layout.background.highlightTopOpacity}) 0%, transparent ${layout.background.highlightHeightFraction * 100}%)`
      : `linear-gradient(180deg, ${theme.markVariant === 'on-light' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)'} 0%, transparent 28%)`,
  }

  const lyricStyle = layout
    ? stageCardLyricStyle(layout)
    : {
        fontFamily: LYRIC_FONT,
        fontStyle: 'italic' as const,
        fontSize: 'clamp(1.35rem, 4.8vw, 1.85rem)',
        color: theme.ink,
        lineHeight: 1.35,
        margin: 0,
        whiteSpace: 'pre-line' as const,
        overflowWrap: 'normal' as const,
        wordBreak: 'keep-all' as const,
      }

  const markStyle: CSSProperties = layout
    ? { ...stageCardMarkStyle(layout), zIndex: 3 }
    : {
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 3,
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
      }

  const markSymbolSize = layout?.mark.symbolSize ?? 22
  const metaSongSize = layout?.meta?.song?.style.fontSize
  const metaArtistSize = layout?.meta?.artist?.style.fontSize
  const artSize = layout?.artwork?.width ?? (isShorts ? 56 : 48)
  const artRadius = artSize * (isShorts ? 10 / 56 : 8 / 48)
  const metaMarginTop = layout?.meta ? (layout.meta.y - layout.lyric.y - layout.lyric.height) : 14

  return (
    <div ref={cardRef} style={isShorts ? { width: '100%', height: '100%' } : undefined}>
      <ComposeLyricCard style={shellStyle}>
        <div aria-hidden style={fillLayerStyle} />
        {!showAtmosphere ? <div aria-hidden style={highlightLayerStyle} /> : null}
        {showAtmosphere ? (
          <AtmospherePreviewRoom key={atmosphereId} personality={atmosphereId} />
        ) : null}
        <div style={markStyle} aria-hidden>
          <MargoSymbol size={markSymbolSize} variant={markVariant} />
        </div>
        <div style={{ position: 'relative', zIndex: 3, height: isShorts ? '100%' : undefined }}>
          <p
            style={isShorts && layout
              ? {
                  ...lyricStyle,
                  position: 'absolute',
                  left: layout.lyric.x,
                  top: layout.lyric.y,
                  width: layout.lyric.maxWidth,
                  margin: 0,
                }
              : lyricStyle}
          >
            {layout && layout.lyric.lines.length > 0
              ? layout.lyric.lines.map((line, i) => (
                  <span
                    key={`${i}-${line.text}`}
                    style={{
                      display: 'block',
                      whiteSpace: 'pre',
                      marginTop: lyricLineOffset(layout, i),
                    }}
                  >
                    {line.text || '\u00a0'}
                  </span>
                ))
              : (layout ? lyricDisplayText(layout) : lyric)}
          </p>

          {(songTitle || artistName) ? (
            <div
              style={isShorts && layout?.meta
                ? {
                    position: 'absolute',
                    left: layout.meta.x,
                    top: layout.meta.y,
                    minWidth: 0,
                    maxWidth: layout.contentWidth,
                  }
                : { marginTop: metaMarginTop, minWidth: 0 }}
            >
              {songTitle ? (
                <p
                  style={{
                    margin: 0,
                    fontFamily: UI_FONT,
                    fontSize: metaSongSize ?? '0.78rem',
                    fontWeight: 700,
                    color: theme.ink,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {layout?.meta?.song?.text ?? songTitle}
                </p>
              ) : null}
              {artistName ? (
                <p
                  style={{
                    margin: songTitle ? '3px 0 0' : 0,
                    fontFamily: UI_FONT,
                    fontSize: metaArtistSize ?? '0.72rem',
                    fontWeight: 400,
                    color: theme.inkMuted,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {layout?.meta?.artist?.text ?? artistName}
                </p>
              ) : null}
            </div>
          ) : null}

          {artwork ? (
            <img
              src={artwork}
              alt=""
              style={{
                width: artSize,
                height: artSize,
                borderRadius: artRadius,
                objectFit: 'cover',
                position: isShorts && layout?.artwork ? 'absolute' : undefined,
                left: isShorts && layout?.artwork ? layout.artwork.x : undefined,
                top: isShorts && layout?.artwork ? layout.artwork.y : undefined,
                marginTop: isShorts ? 0 : layout?.artwork
                  ? layout.artwork.y - (layout.meta
                    ? layout.meta.y + layout.meta.height
                    : layout.lyric.y + layout.lyric.height)
                  : 14,
                display: 'block',
              }}
            />
          ) : null}

          {(canPlay || listenUrl) ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isShorts ? 'flex-end' : undefined,
                marginTop: isShorts ? 0 : '16px',
                gap: '12px',
                minHeight: 'var(--margo-touch-min)',
                position: isShorts ? 'absolute' : undefined,
                right: isShorts && layout ? layout.padding.right : undefined,
                top: isShorts && layout
                  ? (layout.artwork
                    ? layout.artwork.y + (layout.artwork.height - 44) / 2
                    : layout.meta
                      ? layout.meta.y + (layout.meta.height - 44) / 2
                      : undefined)
                  : undefined,
                bottom: isShorts && !(layout?.artwork || layout?.meta) ? 36 : undefined,
                zIndex: 4,
              }}
            >
              {canPlay ? (
                <button
                  type="button"
                  onClick={onPlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                  style={{
                    ...playControlStyle,
                    width: isShorts ? 44 : playControlStyle.width,
                    height: isShorts ? 44 : playControlStyle.height,
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
                    textDecoration: 'none',
                    fontFamily: UI_FONT,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.2px',
                    color: theme.ink,
                  }}
                >
                  Listen <ShareIcon size={12} color="currentColor" />
                </a>
              ) : null}
            </div>
          ) : null}

          {showVibeFooter ? (
            <div style={{
              marginTop: isShorts ? 0 : '16px',
              position: isShorts ? 'absolute' : undefined,
              right: isShorts && layout ? layout.padding.right : undefined,
              bottom: isShorts && layout ? layout.padding.bottom : undefined,
              zIndex: 4,
            }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  minHeight: '22px',
                }}
              >
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
              </div>

              {vibePickerOpen && canPickVibe ? (
                <div
                  role="listbox"
                  aria-label="Choose a vibe"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '8px',
                    marginTop: '14px',
                    width: '100%',
                    paddingBottom: '2px',
                    borderTop: `1px solid ${theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.1)' : 'rgba(255,255,255,0.1)'}`,
                    paddingTop: '14px',
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
                          minHeight: 'var(--margo-touch-min)',
                          padding: '0 8px',
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
            </div>
          ) : null}
        </div>
      </ComposeLyricCard>
    </div>
  )
}

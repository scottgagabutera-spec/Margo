import { getStageCardTheme } from '@/lib/moment/stage-theme'
import {
  roundStageToken,
  scaleStageToken,
  STAGE_CARD_LAYOUT_REF,
  stageCardScale,
} from '@/lib/moment-export/layout/constants'
import { layoutLyricText, truncateToWidth } from '@/lib/moment-export/layout/text-layout'
import type {
  LayoutLyricBlock,
  LayoutMetaBlock,
  ResolvedStageCardLayout,
  StageCardLayoutInput,
  TextMeasureFn,
} from '@/lib/moment-export/layout/types'

function lyricFont(measureFontSize: number): string {
  const ref = STAGE_CARD_LAYOUT_REF.lyric
  return `${ref.fontStyle} ${measureFontSize}px ${ref.fontFamily}`
}

function metaSongFont(size: number, geistFamily: string): string {
  const ref = STAGE_CARD_LAYOUT_REF.meta.song
  return `${ref.fontWeight} ${size}px ${geistFamily}`
}

function metaArtistFont(size: number, geistFamily: string): string {
  const ref = STAGE_CARD_LAYOUT_REF.meta.artist
  return `${ref.fontWeight} ${size}px ${geistFamily}`
}

function vibeFont(size: number, geistFamily: string): string {
  const ref = STAGE_CARD_LAYOUT_REF.vibePill
  return `${ref.fontWeight} ${size}px ${geistFamily}`
}

/**
 * Resolve all Stage card layout decisions for a given output width.
 * Pure layout — no canvas drawing.
 */
export function resolveStageCardLayout(
  input: StageCardLayoutInput,
  measure: TextMeasureFn,
  geistFamily = 'system-ui, sans-serif',
): ResolvedStageCardLayout {
  const W = Math.max(1, input.outputWidthPx)
  const s = stageCardScale(W)
  const theme = getStageCardTheme(input.themeId)
  const ref = STAGE_CARD_LAYOUT_REF

  const padding = {
    top: scaleStageToken(ref.padding.top, W),
    right: scaleStageToken(ref.padding.right, W),
    bottom: scaleStageToken(ref.padding.bottom, W),
    left: scaleStageToken(ref.padding.left, W),
  }
  const borderRadius = roundStageToken(ref.borderRadius, W)
  const contentWidth = W - padding.left - padding.right

  const lyricFontSize = roundStageToken(ref.lyric.fontSize, W)
  const lyricLineHeight = lyricFontSize * ref.lyric.lineHeight
  const lyricMeasureFont = lyricFont(measureFontSizeForCanvas(lyricFontSize))

  const displayLines = layoutLyricText(
    input.lyric || '',
    contentWidth,
    measure,
    lyricMeasureFont,
  )
  const lyricHeight = displayLines.length * lyricLineHeight

  let cursorY = padding.top

  const lyric: LayoutLyricBlock = {
    sourceText: input.lyric || '',
    displayLines,
    style: {
      fontFamily: ref.lyric.fontFamily,
      fontStyle: ref.lyric.fontStyle,
      fontWeight: ref.lyric.fontWeight,
      fontSize: lyricFontSize,
      lineHeight: ref.lyric.lineHeight,
      color: theme.ink,
    },
    x: padding.left,
    y: cursorY,
    maxWidth: contentWidth,
    height: lyricHeight,
  }

  cursorY += lyricHeight

  const songTitle = (input.songTitle || '').trim()
  const artistName = (input.artistName || '').trim()
  let meta: LayoutMetaBlock | null = null

  if (songTitle || artistName) {
    const metaGap = scaleStageToken(ref.meta.gap, W)
    const songFS = roundStageToken(ref.meta.song.fontSize, W)
    const artistFS = roundStageToken(ref.meta.artist.fontSize, W)
    const metaY = cursorY + metaGap
    let metaCursor = metaY
    let metaHeight = 0

    const songFont = metaSongFont(songFS, geistFamily)
    const artistFont = metaArtistFont(artistFS, geistFamily)

    let songLine = null
    if (songTitle) {
      const truncated = truncateToWidth(songTitle, contentWidth, measure, songFont)
      songLine = {
        text: truncated,
        style: {
          fontFamily: geistFamily,
          fontStyle: 'normal' as const,
          fontWeight: ref.meta.song.fontWeight,
          fontSize: songFS,
          lineHeight: ref.meta.song.lineHeight,
          color: theme.ink,
        },
        y: metaCursor,
        truncated: truncated !== songTitle,
      }
      metaCursor += songFS * ref.meta.song.lineHeight
      metaHeight += songFS * ref.meta.song.lineHeight
    }

    let artistLine = null
    if (artistName) {
      if (songTitle) {
        metaCursor += scaleStageToken(ref.meta.artist.marginTop, W)
        metaHeight += scaleStageToken(ref.meta.artist.marginTop, W)
      }
      const truncated = truncateToWidth(artistName, contentWidth, measure, artistFont)
      artistLine = {
        text: truncated,
        style: {
          fontFamily: geistFamily,
          fontStyle: 'normal' as const,
          fontWeight: ref.meta.artist.fontWeight,
          fontSize: artistFS,
          lineHeight: ref.meta.artist.lineHeight,
          color: theme.inkMuted,
        },
        y: metaCursor,
        truncated: truncated !== artistName,
      }
      metaHeight += artistFS * ref.meta.artist.blockLineHeight
    }

    meta = {
      song: songLine,
      artist: artistLine,
      y: metaY,
      height: metaHeight,
    }
    cursorY = metaY + metaHeight
  }

  let artwork = null
  if (input.artworkUrl) {
    const artGap = scaleStageToken(ref.artwork.gap, W)
    const artSize = roundStageToken(ref.artwork.size, W)
    cursorY += artGap
    artwork = {
      x: padding.left,
      y: cursorY,
      width: artSize,
      height: artSize,
    }
    cursorY += artSize
  }

  const markContainer = roundStageToken(ref.mark.container, W)
  const markSymbol = roundStageToken(ref.mark.symbol, W)
  const markInset = scaleStageToken(ref.mark.inset, W)
  const mark: ResolvedStageCardLayout['mark'] = {
    container: {
      x: W - markInset - markContainer,
      y: markInset,
      width: markContainer,
      height: markContainer,
    },
    symbolSize: markSymbol,
    insetShadowColor: theme.markVariant === 'on-light'
      ? ref.mark.insetShadowLight
      : ref.mark.insetShadowDark,
  }

  let vibePill: ResolvedStageCardLayout['vibePill'] = null
  const includeVibe = input.includeVibePill !== false && !!(input.vibeLabel || '').trim()
  const vibeRowExtra = includeVibe && input.vibeLabel
    ? scaleStageToken(ref.vibePill.rowGap, W) + roundStageToken(ref.vibePill.height, W)
    : 0

  const contentBottom = cursorY
  let outputHeight = Math.ceil(
    Math.max(contentBottom + padding.bottom + vibeRowExtra, padding.top + lyricLineHeight + padding.bottom),
  )

  if (includeVibe && input.vibeLabel) {
    const pillH = roundStageToken(ref.vibePill.height, W)
    const pillFS = Math.max(9, roundStageToken(ref.vibePill.fontSize, W))
    const maxPillW = scaleStageToken(ref.vibePill.maxWidth, W)
    const padH = scaleStageToken(ref.vibePill.paddingH, W)
    const font = vibeFont(pillFS, geistFamily)
    const display = truncateToWidth(input.vibeLabel.toUpperCase(), maxPillW - padH * 2, measure, font)
    const textW = measure(display, font)
    const pillW = Math.min(maxPillW, Math.max(scaleStageToken(ref.vibePill.minWidth, W), textW + padH * 2))
    const x = W - padding.right - pillW
    const y = outputHeight - padding.bottom - pillH
    vibePill = {
      label: display,
      rect: { x, y, width: pillW, height: pillH },
      fontSize: pillFS,
      fontFamily: geistFamily,
      fontWeight: ref.vibePill.fontWeight,
    }
  }

  return {
    outputWidth: W,
    outputHeight,
    scale: s,
    borderRadius,
    padding,
    contentWidth,
    background: {
      base: theme.bg,
      border: theme.border,
      highlightTopOpacity: theme.markVariant === 'on-light'
        ? ref.highlight.opacityLight
        : ref.highlight.opacityDark,
      highlightHeightFraction: ref.highlight.heightFraction,
      onLight: theme.markVariant === 'on-light',
    },
    theme,
    lyric,
    meta,
    artwork,
    mark,
    vibePill,
  }
}

/** Canvas measureText uses integer px in font string */
function measureFontSizeForCanvas(px: number): number {
  return Math.round(px)
}

export function buildCanvasTextMeasure(
  ctx: CanvasRenderingContext2D,
): TextMeasureFn {
  return (text, font) => {
    ctx.font = font
    return ctx.measureText(text).width
  }
}

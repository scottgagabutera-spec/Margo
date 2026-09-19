import { getStageCardTheme } from '@/lib/moment/stage-theme'
import {
  roundStageToken,
  scaleStageToken,
  SHORTS_ASPECT,
  STAGE_CARD_LAYOUT_REF,
  STAGE_SHORTS_LAYOUT_REF,
  stageCardScale,
} from '@/lib/moment-export/layout/constants'
import {
  layoutLyricText,
  truncateToWidth,
} from '@/lib/moment-export/layout/text-layout'
import type {
  LayoutLyricBlock,
  LayoutMetaBlock,
  ResolvedStageCardLayout,
  StageCardFormat,
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

function measureFontSizeForCanvas(px: number): number {
  return Math.round(px)
}

/**
 * Resolve all Stage card layout decisions for a given output width.
 * Pure layout — no canvas drawing.
 *
 * Feed: content-height quote card, left-aligned lyric, uniform type.
 * Shorts: native 9:16 full-bleed, centered lyric, footer pinned to the bottom.
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
  const format: StageCardFormat = input.format === 'shorts' ? 'shorts' : 'feed'
  const shorts = format === 'shorts'
  const padRef = shorts ? STAGE_SHORTS_LAYOUT_REF.padding : ref.padding

  const padding = {
    top: scaleStageToken(padRef.top, W),
    right: scaleStageToken(padRef.right, W),
    bottom: scaleStageToken(padRef.bottom, W),
    left: scaleStageToken(padRef.left, W),
  }
  const borderRadius = shorts
    ? STAGE_SHORTS_LAYOUT_REF.borderRadius
    : roundStageToken(ref.borderRadius, W)
  const contentWidth = W - padding.left - padding.right

  const lyricSource = input.lyric || ''
  const lyricFontSize = roundStageToken(ref.lyric.fontSize, W)
  const lyricMeasureFont = lyricFont(measureFontSizeForCanvas(lyricFontSize))
  const displayLines = layoutLyricText(lyricSource, contentWidth, measure, lyricMeasureFont)
  const lyricLineHeight = lyricFontSize * ref.lyric.lineHeight
  const lyricHeight = displayLines.length * lyricLineHeight

  const songTitle = (input.songTitle || '').trim()
  const artistName = (input.artistName || '').trim()
  const songFS = roundStageToken(ref.meta.song.fontSize, W)
  const artistFS = roundStageToken(ref.meta.artist.fontSize, W)
  const metaGap = scaleStageToken(ref.meta.gap, W)
  const artGap = scaleStageToken(ref.artwork.gap, W)
  const artSize = roundStageToken(ref.artwork.size, W)
  const hasArt = !!input.artworkUrl

  let metaHeight = 0
  if (songTitle) metaHeight += songFS * ref.meta.song.lineHeight
  if (artistName) {
    if (songTitle) metaHeight += scaleStageToken(ref.meta.artist.marginTop, W)
    metaHeight += artistFS * ref.meta.artist.blockLineHeight
  }

  const includeVibe = input.includeVibePill !== false && !!(input.vibeLabel || '').trim()
  const vibeH = includeVibe
    ? scaleStageToken(ref.vibePill.rowGap, W) + roundStageToken(ref.vibePill.height, W)
    : 0

  let cursorY = padding.top
  let outputHeight = shorts ? Math.round(W * SHORTS_ASPECT) : 0
  if (shorts) {
    const footerH = hasArt ? Math.max(artSize, metaHeight) : metaHeight
    const footerBlock = (footerH > 0 ? footerH + artGap : 0) + vibeH
    const available = Math.max(lyricLineHeight, outputHeight - padding.top - padding.bottom - footerBlock)
    cursorY = padding.top + Math.max(0, (available - lyricHeight) / 2)
  }

  const lyric: LayoutLyricBlock = {
    sourceText: lyricSource,
    displayLines,
    align: shorts ? 'center' : 'left',
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

  let meta: LayoutMetaBlock | null = null
  if (songTitle || artistName) {
    const songFont = metaSongFont(songFS, geistFamily)
    const artistFont = metaArtistFont(artistFS, geistFamily)
    const metaMaxW = shorts && hasArt
      ? Math.max(24, contentWidth - artSize - artGap)
      : contentWidth
    const metaX = shorts && hasArt
      ? padding.left + artSize + artGap
      : padding.left

    let metaY: number
    if (shorts) {
      const footerH = hasArt ? Math.max(artSize, metaHeight) : metaHeight
      const footerY = outputHeight! - padding.bottom - vibeH - footerH
      metaY = footerY + Math.max(0, (footerH - metaHeight) / 2)
    } else {
      metaY = cursorY + metaGap
    }

    let metaCursor = metaY
    const songTrunc = songTitle ? truncateToWidth(songTitle, metaMaxW, measure, songFont) : ''
    const songLine = songTitle
      ? {
          text: songTrunc,
          style: {
            fontFamily: geistFamily,
            fontStyle: 'normal' as const,
            fontWeight: ref.meta.song.fontWeight,
            fontSize: songFS,
            lineHeight: ref.meta.song.lineHeight,
            color: theme.ink,
          },
          y: metaCursor,
          truncated: songTrunc !== songTitle,
        }
      : null
    if (songLine) metaCursor += songFS * ref.meta.song.lineHeight

    let artistLine = null
    if (artistName) {
      if (songTitle) metaCursor += scaleStageToken(ref.meta.artist.marginTop, W)
      const truncated = truncateToWidth(artistName, metaMaxW, measure, artistFont)
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
    }

    meta = { song: songLine, artist: artistLine, x: metaX, y: metaY, height: metaHeight }
    if (!shorts) cursorY = metaY + metaHeight
  }

  let artwork: ResolvedStageCardLayout['artwork'] = null
  if (hasArt) {
    if (shorts) {
      const footerH = Math.max(artSize, metaHeight)
      const footerY = outputHeight! - padding.bottom - vibeH - footerH
      artwork = {
        x: padding.left,
        y: footerY + Math.max(0, (footerH - artSize) / 2),
        width: artSize,
        height: artSize,
      }
    } else {
      cursorY += artGap
      artwork = {
        x: padding.left,
        y: cursorY,
        width: artSize,
        height: artSize,
      }
      cursorY += artSize
    }
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

  if (!shorts) {
    outputHeight = Math.ceil(
      Math.max(cursorY + padding.bottom + vibeH, padding.top + lyricLineHeight + padding.bottom),
    )
  }

  let vibePill: ResolvedStageCardLayout['vibePill'] = null
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
    const y = outputHeight! - padding.bottom - pillH
    vibePill = {
      label: display,
      rect: { x, y, width: pillW, height: pillH },
      fontSize: pillFS,
      fontFamily: geistFamily,
      fontWeight: ref.vibePill.fontWeight,
    }
  }

  return {
    format,
    outputWidth: W,
    outputHeight: outputHeight!,
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

export function buildCanvasTextMeasure(
  ctx: CanvasRenderingContext2D,
): TextMeasureFn {
  return (text, font) => {
    ctx.font = font
    return ctx.measureText(text).width
  }
}

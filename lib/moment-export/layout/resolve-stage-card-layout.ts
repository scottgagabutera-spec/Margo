import { resolveExportPaintTheme } from '@/lib/moment/stage-theme'
import {
  roundStageToken,
  scaleStageToken,
  SHORTS_ASPECT,
  STAGE_CARD_LAYOUT_REF,
  STAGE_SHORTS_LAYOUT_REF,
  VERTICAL_SOCIAL_SAFE,
  WIDE_HEIGHT_FRACTION,
  stageCardScale,
} from '@/lib/moment-export/layout/constants'
import {
  presentLyricText,
  presentLyricTextWithMaxHeight,
  truncateToWidth,
} from '@/lib/moment-export/layout/text-layout'
import type { LayoutLyricLine } from '@/lib/moment-export/layout/types'
import type {
  LayoutLyricBlock,
  LayoutMetaBlock,
  ResolvedStageCardLayout,
  StageCardFormat,
  StageCardLayoutInput,
  TextMeasureFn,
} from '@/lib/moment-export/layout/types'
import { resolveSocialExportLayout } from '@/lib/moment-export/layout/social-export-layout'

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

function lyricBlockHeight(
  lines: Array<{ text: string; continuation: boolean }>,
  linePx: number,
  stanzaGap: number,
): number {
  if (lines.length === 0) return linePx
  let height = 0
  for (let i = 0; i < lines.length; i++) {
    height += linePx
    const next = lines[i + 1]
    if (next && !next.continuation && lines[i].text !== '' && next.text !== '') {
      height += stanzaGap
    }
  }
  return height
}

function placeLyricLines(
  rows: Array<{ text: string; continuation: boolean }>,
  startY: number,
  linePx: number,
  stanzaGap: number,
): LayoutLyricLine[] {
  const lines: LayoutLyricLine[] = []
  let y = startY
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    lines.push({ text: row.text, y, continuation: row.continuation })
    y += linePx
    const next = rows[i + 1]
    if (next && !next.continuation && row.text !== '' && next.text !== '') {
      y += stanzaGap
    }
  }
  return lines
}

/**
 * Resolve all Stage card layout decisions for a given output width.
 * Pure layout — no canvas drawing.
 *
 * Feed: content-height quote card, left-aligned lyric, uniform type.
 * Square: fixed 1:1, centered lyric, Margo mark in a reserved bottom band.
 * Shorts: native 9:16 full-bleed, lyric + credits in the vertical-social
 * safe rectangle; mark anchored in the bottom safe band.
 * Wide: fixed 16:9 — artwork left, lyric/meta right, mark clear of text.
 */
export function resolveStageCardLayout(
  input: StageCardLayoutInput,
  measure: TextMeasureFn,
  geistFamily = 'system-ui, sans-serif',
): ResolvedStageCardLayout {
  const W = Math.max(1, input.outputWidthPx)
  const s = stageCardScale(W)
  const variant = input.layoutVariant ?? (input.format === 'shorts' ? 'shorts' : 'feed')
  if (variant === 'square' || variant === 'shorts' || variant === 'wide') {
    return resolveSocialExportLayout(input, measure, geistFamily)
  }

  const theme = resolveExportPaintTheme(input.themeId, input.exportAtmosphereId)
  const ref = STAGE_CARD_LAYOUT_REF
  const format: StageCardFormat = input.format === 'shorts' ? 'shorts' : 'feed'
  const shorts = format === 'shorts'
  const isWide = false
  const isSquare = false
  const fixedFrame = shorts
  const shortsHeight = shorts
    ? Math.round(input.outputHeightPx ?? W * SHORTS_ASPECT)
    : 0
  const squareHeight = isSquare ? Math.round(input.outputHeightPx ?? W) : 0
  const wideHeight = isWide
    ? Math.round(input.outputHeightPx ?? W * WIDE_HEIGHT_FRACTION)
    : 0
  const padding = shorts
    ? {
        top: Math.round(shortsHeight * VERTICAL_SOCIAL_SAFE.topFraction),
        bottom: Math.round(shortsHeight * VERTICAL_SOCIAL_SAFE.bottomFraction),
        left: Math.max(
          roundStageToken(STAGE_SHORTS_LAYOUT_REF.padding.left, W),
          Math.round(W * VERTICAL_SOCIAL_SAFE.sideFraction),
        ),
        right: Math.max(
          roundStageToken(STAGE_SHORTS_LAYOUT_REF.padding.right, W),
          Math.round(W * VERTICAL_SOCIAL_SAFE.sideFraction),
        ),
      }
    : {
        top: scaleStageToken(ref.padding.top, W),
        right: scaleStageToken(ref.padding.right, W),
        bottom: scaleStageToken(ref.padding.bottom, W),
        left: scaleStageToken(ref.padding.left, W),
      }
  const borderRadius = shorts
    ? STAGE_SHORTS_LAYOUT_REF.borderRadius
    : roundStageToken(ref.borderRadius, W)
  const contentWidth = W - padding.left - padding.right

  const songTitle = (input.songTitle || '').trim()
  const artistName = (input.artistName || '').trim()
  const songFS = roundStageToken(ref.meta.song.fontSize, W)
  const artistFS = roundStageToken(ref.meta.artist.fontSize, W)
  const metaGap = scaleStageToken(ref.meta.gap, W)
  const artRef = shorts ? STAGE_SHORTS_LAYOUT_REF.artwork : ref.artwork
  const artGap = scaleStageToken(artRef.gap, W)
  const lyricCreditGap = shorts
    ? scaleStageToken(STAGE_SHORTS_LAYOUT_REF.lyricCreditGap, W)
    : artGap
  const artSize = roundStageToken(artRef.size, W)
  const hasArt = !!input.artworkUrl
  const wideArtSize = isWide ? roundStageToken(Math.max(artRef.size, 72), W) : artSize

  let metaHeight = 0
  if (songTitle) metaHeight += songFS * ref.meta.song.lineHeight
  if (artistName) {
    if (songTitle) metaHeight += scaleStageToken(ref.meta.artist.marginTop, W)
    metaHeight += artistFS * ref.meta.artist.blockLineHeight
  }

  const includeVibe = input.includeVibePill !== false && !!(input.vibeLabel || '').trim()
  const vibeH = includeVibe && !shorts && !isWide && !isSquare
    ? scaleStageToken(ref.vibePill.rowGap, W) + roundStageToken(ref.vibePill.height, W)
    : 0
  const vibePillH = includeVibe ? roundStageToken(ref.vibePill.height, W) : 0
  const vibeReserve = includeVibe && shorts
    ? scaleStageToken(ref.vibePill.maxWidth, W) + artGap
    : 0

  const markContainer = roundStageToken(ref.mark.container, W)
  const markSymbol = roundStageToken(ref.mark.symbol, W)
  const markInset = scaleStageToken(ref.mark.inset, W)
  const markGap = scaleStageToken(ref.markContentGap, W)
  const creditH = Math.max(
    shorts && hasArt ? artSize : isWide && hasArt ? wideArtSize : hasArt ? artSize : 0,
    metaHeight,
    vibePillH,
  )
  const creditBlock = creditH > 0 ? creditH + lyricCreditGap : 0

  const frameHeight = shorts
    ? shortsHeight
    : isSquare
      ? squareHeight
      : isWide
        ? wideHeight
        : 0
  const logoBand = markContainer + markInset
  const markSideReserve = isWide ? markContainer + markInset + markGap : 0
  const lyricColWidth = isWide
    ? Math.max(
      48,
      contentWidth - (hasArt ? wideArtSize + artGap : 0) - markSideReserve,
    )
    : contentWidth
  const lyricX = isWide && hasArt ? padding.left + wideArtSize + artGap : padding.left

  const lyricSource = input.lyric || ''
  const lyricSizeRef = shorts
    ? STAGE_SHORTS_LAYOUT_REF.lyric.fontSize
    : isWide
      ? 20
      : isSquare
        ? 18
        : ref.lyric.fontSize
  const lyricMinRef = shorts ? STAGE_SHORTS_LAYOUT_REF.lyric.minFontSize : ref.lyric.minFontSize
  const lyricLeading = shorts ? STAGE_SHORTS_LAYOUT_REF.lyric.lineHeight : ref.lyric.lineHeight
  const lyricGapEm = shorts ? STAGE_SHORTS_LAYOUT_REF.lyric.stanzaGapEm : ref.lyric.stanzaGapEm
  const presentOpts = {
    fontStyle: ref.lyric.fontStyle,
    fontFamily: ref.lyric.fontFamily,
    maxFontSize: roundStageToken(lyricSizeRef, W),
    minFontSize: roundStageToken(lyricMinRef, W),
  }

  let maxLyricHeight = 0
  if (fixedFrame && frameHeight > 0) {
    let bodyBottom = frameHeight - padding.bottom
    if (isSquare) bodyBottom -= logoBand
    if (shorts) bodyBottom -= 0
    const bodyTop = padding.top
    const footer = isSquare || isWide ? creditBlock + (isSquare || isWide ? metaGap : 0) : creditBlock
    maxLyricHeight = Math.max(
      roundStageToken(lyricMinRef, W) * lyricLeading,
      bodyBottom - bodyTop - footer,
    )
  }

  const presented = fixedFrame && maxLyricHeight > 0
    ? presentLyricTextWithMaxHeight(lyricSource, lyricColWidth, measure, {
      ...presentOpts,
      maxHeightPx: maxLyricHeight,
      lineHeight: lyricLeading,
      stanzaGapEm: lyricGapEm,
    })
    : presentLyricText(lyricSource, lyricColWidth, measure, presentOpts)
  const lyricFontSize = presented.fontSize
  const displayLines = presented.lines.map((line) => line.text)
  const lyricLineHeight = lyricFontSize * lyricLeading
  const stanzaGap = lyricFontSize * lyricGapEm
  const lyricHeight = lyricBlockHeight(presented.lines, lyricLineHeight, stanzaGap)

  let cursorY = padding.top
  let shortsCreditY = 0
  let outputHeight = shorts ? shortsHeight : isSquare ? squareHeight : isWide ? wideHeight : 0
  let squareCreditY = 0
  let wideArtY = 0

  if (shorts) {
    const bodyTop = padding.top
    const bodyBottom = shortsHeight - padding.bottom
    const available = Math.max(lyricLineHeight, bodyBottom - bodyTop - creditBlock)
    cursorY = lyricHeight <= available
      ? bodyTop + Math.max(0, (available - lyricHeight) / 2)
      : bodyTop
    shortsCreditY = cursorY + lyricHeight + lyricCreditGap
    if (creditH > 0 && shortsCreditY + creditH > bodyBottom) {
      shortsCreditY = bodyBottom - creditH
      cursorY = Math.max(bodyTop, shortsCreditY - lyricCreditGap - lyricHeight)
    }
  } else if (isSquare && squareHeight > 0) {
    const bodyTop = padding.top
    const bodyBottom = squareHeight - padding.bottom - logoBand
    const footer = creditBlock > 0 ? creditBlock + metaGap : 0
    const available = Math.max(lyricLineHeight, bodyBottom - bodyTop - footer)
    cursorY = bodyTop + Math.max(0, (available - lyricHeight) / 2)
    squareCreditY = bodyBottom - (creditH > 0 ? creditH : 0)
  } else if (isWide && wideHeight > 0) {
    const bodyTop = padding.top
    const bodyBottom = wideHeight - padding.bottom
    const metaReserve = (songTitle || artistName)
      ? metaHeight + metaGap
      : 0
    const available = Math.max(
      lyricLineHeight,
      bodyBottom - bodyTop - metaReserve - (includeVibe ? vibePillH + metaGap : 0),
    )
    cursorY = bodyTop + Math.max(0, (available - lyricHeight) / 2)
    if (hasArt) {
      const artH = wideArtSize
      wideArtY = padding.top + Math.max(0, (bodyBottom - bodyTop - artH) / 2)
    }
  }

  const lyricLines = placeLyricLines(presented.lines, cursorY, lyricLineHeight, stanzaGap)
  const lyric: LayoutLyricBlock = {
    sourceText: lyricSource,
    displayLines,
    lines: lyricLines,
    stanzaGap,
    align: shorts || isSquare ? 'center' : 'left',
    style: {
      fontFamily: ref.lyric.fontFamily,
      fontStyle: ref.lyric.fontStyle,
      fontWeight: ref.lyric.fontWeight,
      fontSize: lyricFontSize,
      lineHeight: lyricLeading,
      color: theme.ink,
    },
    x: lyricX,
    y: cursorY,
    maxWidth: lyricColWidth,
    height: lyricHeight,
  }

  cursorY += lyricHeight

  let meta: LayoutMetaBlock | null = null
  if (songTitle || artistName) {
    const songFont = metaSongFont(songFS, geistFamily)
    const artistFont = metaArtistFont(artistFS, geistFamily)
    const metaMaxW = shorts
      ? Math.max(24, contentWidth - (hasArt ? artSize + artGap : 0) - vibeReserve)
      : isWide
        ? lyricColWidth
        : contentWidth
    let metaX = padding.left
    if (shorts && hasArt) metaX = padding.left + artSize + artGap
    else if (isWide) metaX = lyricX
    else if (isSquare && hasArt) {
      metaX = padding.left
        + (contentWidth - Math.min(metaMaxW, contentWidth - artSize - artGap)) / 2
        + artSize
        + artGap
    }

    let metaY: number
    if (shorts) {
      metaY = shortsCreditY + Math.max(0, (creditH - metaHeight) / 2)
    } else if (isSquare) {
      metaY = squareCreditY + Math.max(0, (creditH - metaHeight) / 2)
    } else if (isWide) {
      metaY = lyric.y + lyric.height + metaGap
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
    if (!shorts && !isSquare && !isWide) cursorY = metaY + metaHeight
  }

  let artwork: ResolvedStageCardLayout['artwork'] = null
  if (hasArt) {
    if (shorts) {
      artwork = {
        x: padding.left,
        y: shortsCreditY + Math.max(0, (creditH - artSize) / 2),
        width: artSize,
        height: artSize,
      }
    } else if (isWide) {
      artwork = {
        x: padding.left,
        y: wideArtY,
        width: wideArtSize,
        height: wideArtSize,
      }
    } else if (isSquare) {
      const squareArtSize = artSize
      const hasMeta = !!(songTitle || artistName)
      const rowW = hasMeta
        ? squareArtSize + artGap + contentWidth * 0.5
        : squareArtSize
      const artX = padding.left + Math.max(0, (contentWidth - rowW) / 2)
      artwork = {
        x: artX,
        y: squareCreditY + Math.max(0, (creditH - squareArtSize) / 2),
        width: squareArtSize,
        height: squareArtSize,
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

  let markX = W - markInset - markContainer
  let markY = markInset
  if (shorts) {
    markX = padding.left
    markY = shortsHeight - padding.bottom + Math.max(0, Math.round((padding.bottom - markContainer) / 2))
  } else if (isSquare) {
    markX = W - markInset - markContainer
    markY = squareHeight - padding.bottom - markContainer
  } else if (isWide) {
    markX = W - markInset - markContainer
    markY = wideHeight - padding.bottom - markContainer
  } else {
    markX = W - markInset - markContainer
    markY = markInset
  }

  const mark: ResolvedStageCardLayout['mark'] = {
    container: {
      x: markX,
      y: markY,
      width: markContainer,
      height: markContainer,
    },
    symbolSize: markSymbol,
    insetShadowColor: theme.markVariant === 'on-light'
      ? ref.mark.insetShadowLight
      : ref.mark.insetShadowDark,
  }

  if (!fixedFrame) {
    outputHeight = Math.ceil(
      Math.max(cursorY + padding.bottom + vibeH, padding.top + lyricLineHeight + padding.bottom),
    )
  } else if (!outputHeight) {
    outputHeight = frameHeight
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
    const x = isWide
      ? lyricX
      : W - padding.right - pillW
    const y = shorts
      ? shortsCreditY + Math.max(0, (creditH - pillH) / 2)
      : isWide
        ? (meta ? meta.y + meta.height + metaGap : lyric.y + lyric.height + metaGap)
        : isSquare
          ? squareHeight - padding.bottom - logoBand - markGap - pillH
          : outputHeight! - padding.bottom - pillH
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
    creditPlate: null,
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

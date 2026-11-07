import { resolveExportPaintTheme } from '@/lib/moment/stage-theme'
import {
  roundStageToken,
  scaleStageToken,
  STAGE_CARD_LAYOUT_REF,
  STAGE_SHORTS_LAYOUT_REF,
  VERTICAL_SOCIAL_SAFE,
  WIDE_HEIGHT_FRACTION,
  stageCardScale,
} from '@/lib/moment-export/layout/constants'
import { shouldShowExportArtist, sentenceCaseLabel } from '@/lib/moment-export/export-copy'
import {
  presentLyricTextFillRegion,
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

const ART_SHORT_SIDE_FRAC = 0.14

function metaSongFont(size: number, geistFamily: string): string {
  const ref = STAGE_CARD_LAYOUT_REF.meta.song
  return `${ref.fontWeight} ${size}px ${geistFamily}`
}

function metaArtistFont(size: number, geistFamily: string): string {
  const ref = STAGE_CARD_LAYOUT_REF.meta.artist
  return `${ref.fontWeight} ${size}px ${geistFamily}`
}

function placeLyricLines(
  rows: Array<{ text: string; continuation: boolean }>,
  startY: number,
  linePx: number,
  stanzaGap: number,
) {
  const lines: { text: string; y: number; continuation: boolean }[] = []
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

/**
 * Shared Square / Story / Wide export layout — logo top-right, lyric in a
 * reserved region, artwork + song meta bottom-left.
 */
export function resolveSocialExportLayout(
  input: StageCardLayoutInput,
  measure: TextMeasureFn,
  geistFamily = 'system-ui, sans-serif',
): ResolvedStageCardLayout {
  const W = Math.max(1, input.outputWidthPx)
  const ref = STAGE_CARD_LAYOUT_REF
  const variant = input.layoutVariant ?? 'square'
  const isShorts = variant === 'shorts'
  const isWide = variant === 'wide'
  const isSquare = variant === 'square'
  const format: StageCardFormat = isShorts ? 'shorts' : 'feed'

  const frameHeight = isShorts
    ? Math.round(input.outputHeightPx ?? W * (16 / 9))
    : isWide
      ? Math.round(input.outputHeightPx ?? W * WIDE_HEIGHT_FRACTION)
      : Math.round(input.outputHeightPx ?? W)

  const padding = isShorts
    ? {
        top: Math.round(frameHeight * VERTICAL_SOCIAL_SAFE.topFraction),
        bottom: Math.round(frameHeight * VERTICAL_SOCIAL_SAFE.bottomFraction),
        left: Math.max(roundStageToken(STAGE_SHORTS_LAYOUT_REF.padding.left, W), Math.round(W * VERTICAL_SOCIAL_SAFE.sideFraction)),
        right: Math.max(roundStageToken(STAGE_SHORTS_LAYOUT_REF.padding.right, W), Math.round(W * VERTICAL_SOCIAL_SAFE.sideFraction)),
      }
    : {
        top: scaleStageToken(ref.padding.top, W),
        right: scaleStageToken(ref.padding.right, W),
        bottom: scaleStageToken(ref.padding.bottom, W),
        left: scaleStageToken(ref.padding.left, W),
      }

  const theme = resolveExportPaintTheme(input.themeId, input.exportAtmosphereId)
  const s = stageCardScale(W)
  const contentWidth = W - padding.left - padding.right
  const shortSide = Math.min(W, frameHeight)

  const markContainer = roundStageToken(ref.mark.container, W)
  const markSymbol = roundStageToken(ref.mark.symbol, W)
  const markInset = scaleStageToken(ref.mark.inset, W)
  const markGap = scaleStageToken(ref.markContentGap, W)

  const artSize = Math.max(32, Math.round(shortSide * ART_SHORT_SIDE_FRAC))
  const artRadius = Math.round(artSize * 0.18)
  const artGap = scaleStageToken(ref.artwork.gap, W)
  const lyricCreditGap = scaleStageToken(isShorts ? STAGE_SHORTS_LAYOUT_REF.lyricCreditGap : ref.meta.gap, W)

  const songTitle = sentenceCaseLabel(input.songTitle || '')
  const artistRaw = (input.artistName || '').trim()
  const artistName = shouldShowExportArtist(artistRaw) ? sentenceCaseLabel(artistRaw) : ''

  const songFS = roundStageToken(ref.meta.song.fontSize, W)
  const artistFS = roundStageToken(ref.meta.artist.fontSize, W)
  const metaGap = scaleStageToken(ref.meta.gap, W)
  let metaHeight = 0
  if (songTitle) metaHeight += songFS * ref.meta.song.lineHeight
  if (artistName) {
    if (songTitle) metaHeight += scaleStageToken(ref.meta.artist.marginTop, W)
    metaHeight += artistFS * ref.meta.artist.lineHeight
  }

  const creditH = Math.max(artSize, metaHeight)
  const creditBottom = frameHeight - padding.bottom
  const artY = creditBottom - artSize
  const artX = padding.left
  const hasArt = !!input.artworkUrl

  const markX = W - padding.right - markContainer
  const markY = padding.top

  const lyricTop = padding.top
  const lyricBottom = artY - lyricCreditGap
  const markReserve = markContainer + markGap
  const lyricColWidth = Math.max(48, contentWidth - markReserve)
  const lyricX = padding.left

  const lyricSizeRef = isShorts
    ? STAGE_SHORTS_LAYOUT_REF.lyric.fontSize
    : isWide
      ? 20
      : 18
  const lyricMinRef = isShorts ? STAGE_SHORTS_LAYOUT_REF.lyric.minFontSize : 11
  const lyricLeading = isShorts ? STAGE_SHORTS_LAYOUT_REF.lyric.lineHeight : ref.lyric.lineHeight
  const lyricGapEm = isShorts ? STAGE_SHORTS_LAYOUT_REF.lyric.stanzaGapEm : ref.lyric.stanzaGapEm

  const maxLyricHeight = Math.max(
    roundStageToken(lyricMinRef, W) * lyricLeading,
    lyricBottom - lyricTop,
  )

  const presented = presentLyricTextFillRegion(input.lyric || '', lyricColWidth, measure, {
    fontStyle: ref.lyric.fontStyle,
    fontFamily: ref.lyric.fontFamily,
    maxFontSize: roundStageToken(lyricSizeRef, W),
    minFontSize: roundStageToken(lyricMinRef, W),
    maxHeightPx: maxLyricHeight,
    lineHeight: lyricLeading,
    stanzaGapEm: lyricGapEm,
  })

  const lyricFontSize = presented.fontSize
  const lyricLineHeight = lyricFontSize * lyricLeading
  const stanzaGap = lyricFontSize * lyricGapEm
  const lyricHeight = lyricBlockHeight(presented.lines, lyricLineHeight, stanzaGap)
  const available = Math.max(lyricLineHeight, lyricBottom - lyricTop)
  const cursorY = lyricTop + Math.max(0, (available - lyricHeight) / 2)

  const lyricLines = placeLyricLines(presented.lines, cursorY, lyricLineHeight, stanzaGap)
  const lyric: LayoutLyricBlock = {
    sourceText: input.lyric || '',
    displayLines: presented.lines.map((l) => l.text),
    lines: lyricLines,
    stanzaGap,
    align: 'left',
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

  let meta: LayoutMetaBlock | null = null
  if (songTitle || artistName) {
    const metaMaxW = Math.max(24, contentWidth - artSize - artGap - markReserve)
    const metaX = hasArt ? artX + artSize + artGap : padding.left
    const metaY = artY + Math.max(0, (creditH - metaHeight) / 2)

    const songFont = metaSongFont(songFS, geistFamily)
    const artistFont = metaArtistFont(artistFS, geistFamily)
    let metaCursor = metaY
    const songTrunc = songTitle ? truncateToWidth(songTitle, metaMaxW, measure, songFont) : ''
    const songLine = songTitle
      ? {
          text: songTrunc,
          style: {
            fontFamily: geistFamily,
            fontStyle: 'normal' as const,
            fontWeight: 500,
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
  }

  const artwork: ResolvedStageCardLayout['artwork'] = hasArt
    ? { x: artX, y: artY, width: artSize, height: artSize }
    : null

  const mark: ResolvedStageCardLayout['mark'] = {
    container: { x: markX, y: markY, width: markContainer, height: markContainer },
    symbolSize: markSymbol,
    insetShadowColor: theme.markVariant === 'on-light'
      ? ref.mark.insetShadowLight
      : ref.mark.insetShadowDark,
  }

  return {
    format,
    outputWidth: W,
    outputHeight: frameHeight,
    scale: s,
    borderRadius: isShorts ? 0 : roundStageToken(ref.borderRadius, W),
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
    vibePill: null,
  }
}

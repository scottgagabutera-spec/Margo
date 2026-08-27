import {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
  roundStageToken,
  scaleStageToken,
  STAGE_CARD_LAYOUT_REF,
} from '@/lib/moment-export/layout'
import type {
  LayoutMarkBadge,
  LayoutMetaBlock,
  LayoutRect,
  LayoutVibePill,
  ResolvedStageCardLayout,
  TextMeasureFn,
} from '@/lib/moment-export/layout/types'
import type { StageCardTheme } from '@/lib/moment/stage-theme'
import { getStageCardTheme } from '@/lib/moment/stage-theme'
import {
  MOMENT_VIDEO_HEIGHT,
  MOMENT_VIDEO_PANEL_WIDTH,
  MOMENT_VIDEO_WIDTH,
} from '@/lib/moment-export/video/constants'

/**
 * 9:16 vertical layout — evolved from Stage Moment card, not a centered square card.
 *
 * Safe zones (1080×1920):
 * - Top 8%: breathing room + mark badge
 * - 12–52%: lyric hero (largest type)
 * - 52–68%: song/artist + artwork row
 * - 72–82%: vibe pill
 * - Bottom 10%: trymargo.com watermark
 */
export interface ResolvedVerticalMomentLayout {
  outputWidth: number
  outputHeight: number
  theme: StageCardTheme
  background: ResolvedStageCardLayout['background']
  /** Frosted content panel behind lyric block */
  panel: LayoutRect & { borderRadius: number }
  lyric: ResolvedStageCardLayout['lyric']
  meta: LayoutMetaBlock | null
  artwork: LayoutRect | null
  mark: LayoutMarkBadge
  vibePill: LayoutVibePill | null
  watermarkY: number
  geistFamily: string
}

export interface VerticalLayoutInput {
  lyric: string
  songTitle?: string
  artistName?: string
  artworkUrl?: string | null
  vibeLabel?: string | null
  themeId?: string | null
  geistFamily: string
}

export function resolveVerticalMomentLayout(
  input: VerticalLayoutInput,
  measure: TextMeasureFn,
): ResolvedVerticalMomentLayout {
  const W = MOMENT_VIDEO_WIDTH
  const H = MOMENT_VIDEO_HEIGHT
  const panelW = MOMENT_VIDEO_PANEL_WIDTH
  const panelX = (W - panelW) / 2
  const theme = getStageCardTheme(input.themeId)

  const cardLayout = resolveStageCardLayout({
    lyric: input.lyric,
    songTitle: input.songTitle,
    artistName: input.artistName,
    artworkUrl: input.artworkUrl,
    vibeLabel: input.vibeLabel,
    themeId: input.themeId,
    outputWidthPx: panelW,
    includeVibePill: false,
  }, measure, input.geistFamily)

  const lyricTop = Math.round(H * 0.14)
  const lyricBlock = {
    ...cardLayout.lyric,
    y: lyricTop,
    x: panelX + cardLayout.padding.left,
    maxWidth: panelW - cardLayout.padding.left - cardLayout.padding.right,
  }

  let meta: LayoutMetaBlock | null = null
  if (cardLayout.meta) {
    const metaY = lyricTop + lyricBlock.height + scaleStageToken(STAGE_CARD_LAYOUT_REF.meta.gap, panelW)
    meta = {
      song: cardLayout.meta.song
        ? { ...cardLayout.meta.song, y: metaY }
        : null,
      artist: cardLayout.meta.artist
        ? {
          ...cardLayout.meta.artist,
          y: metaY
            + (cardLayout.meta.song
              ? cardLayout.meta.song.style.fontSize * cardLayout.meta.song.style.lineHeight
              : 0)
            + (cardLayout.meta.song
              ? scaleStageToken(STAGE_CARD_LAYOUT_REF.meta.artist.marginTop, panelW)
              : 0),
        }
        : null,
      y: metaY,
      height: cardLayout.meta.height,
    }
  }

  let artwork: LayoutRect | null = null
  if (cardLayout.artwork && input.artworkUrl) {
    const artSize = roundStageToken(STAGE_CARD_LAYOUT_REF.artwork.size * 1.35, panelW)
    const metaBottom = meta
      ? meta.y + meta.height
      : lyricTop + lyricBlock.height
    artwork = {
      x: panelX + cardLayout.padding.left,
      y: metaBottom + scaleStageToken(STAGE_CARD_LAYOUT_REF.artwork.gap, panelW),
      width: artSize,
      height: artSize,
    }
  }

  let vibePill: LayoutVibePill | null = null
  if (input.vibeLabel?.trim()) {
    const pillH = roundStageToken(STAGE_CARD_LAYOUT_REF.vibePill.height, panelW)
    const pillFS = Math.max(10, roundStageToken(STAGE_CARD_LAYOUT_REF.vibePill.fontSize, panelW))
    const maxPillW = scaleStageToken(STAGE_CARD_LAYOUT_REF.vibePill.maxWidth, panelW) * 1.2
    const padH = scaleStageToken(STAGE_CARD_LAYOUT_REF.vibePill.paddingH, panelW)
    const font = `${STAGE_CARD_LAYOUT_REF.vibePill.fontWeight} ${pillFS}px ${input.geistFamily}`
    const label = input.vibeLabel.trim().toUpperCase()
    const textW = measure(label, font)
    const pillW = Math.min(maxPillW, Math.max(scaleStageToken(STAGE_CARD_LAYOUT_REF.vibePill.minWidth, panelW), textW + padH * 2))
    const y = Math.round(H * 0.76)
    vibePill = {
      label,
      rect: {
        x: panelX + panelW - cardLayout.padding.right - pillW,
        y,
        width: pillW,
        height: pillH,
      },
      fontSize: pillFS,
      fontFamily: input.geistFamily,
      fontWeight: STAGE_CARD_LAYOUT_REF.vibePill.fontWeight,
    }
  }

  const panelTop = lyricTop - cardLayout.padding.top
  const contentBottom = Math.max(
    artwork ? artwork.y + artwork.height : 0,
    meta ? meta.y + meta.height : 0,
    lyricTop + lyricBlock.height,
  )
  const panelBottom = contentBottom + cardLayout.padding.bottom
  const panelH = panelBottom - panelTop

  const markInset = scaleStageToken(STAGE_CARD_LAYOUT_REF.mark.inset, panelW)
  const markContainer = roundStageToken(STAGE_CARD_LAYOUT_REF.mark.container, panelW)
  const mark: LayoutMarkBadge = {
    container: {
      x: panelX + panelW - markInset - markContainer,
      y: panelTop + markInset,
      width: markContainer,
      height: markContainer,
    },
    symbolSize: roundStageToken(STAGE_CARD_LAYOUT_REF.mark.symbol, panelW),
    insetShadowColor: theme.markVariant === 'on-light'
      ? STAGE_CARD_LAYOUT_REF.mark.insetShadowLight
      : STAGE_CARD_LAYOUT_REF.mark.insetShadowDark,
  }

  return {
    outputWidth: W,
    outputHeight: H,
    theme,
    background: cardLayout.background,
    panel: {
      x: panelX,
      y: panelTop,
      width: panelW,
      height: panelH,
      borderRadius: cardLayout.borderRadius,
    },
    lyric: lyricBlock,
    meta,
    artwork,
    mark,
    vibePill,
    watermarkY: H - Math.round(H * 0.06),
    geistFamily: input.geistFamily,
  }
}

export function resolveGeistFontFamily(): string {
  if (typeof document === 'undefined') return 'system-ui, sans-serif'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-sans').trim()
  return v ? `${v}, sans-serif` : 'system-ui, sans-serif'
}

export async function waitForExportFonts(): Promise<void> {
  if (typeof document === 'undefined') return
  try {
    await document.fonts.ready
  } catch {
    /* ignore */
  }
}

export function createVerticalLayoutMeasure(): TextMeasureFn {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return (text) => text.length * 8
  }
  return buildCanvasTextMeasure(ctx)
}

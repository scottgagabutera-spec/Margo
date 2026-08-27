import type { StageCardTheme } from '@/lib/moment/stage-theme'

/** Axis-aligned box in output pixels */
export interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
}

/** Resolved typography for one text run */
export interface LayoutTextStyle {
  fontFamily: string
  fontStyle: 'normal' | 'italic'
  fontWeight: number | string
  fontSize: number
  lineHeight: number
  color: string
}

/**
 * Lyric block after paragraph-aware wrapping.
 * displayLines preserves intentional \\n as paragraph boundaries.
 */
export interface LayoutLyricBlock {
  /** Raw lyric input (may contain \\n) */
  sourceText: string
  /** Visual lines — word-wrapped within each paragraph */
  displayLines: string[]
  style: LayoutTextStyle
  x: number
  y: number
  maxWidth: number
  height: number
}

export interface LayoutMetaLine {
  text: string
  style: LayoutTextStyle
  y: number
  truncated: boolean
}

export interface LayoutMetaBlock {
  song: LayoutMetaLine | null
  artist: LayoutMetaLine | null
  y: number
  height: number
}

export interface LayoutMarkBadge {
  container: LayoutRect
  symbolSize: number
  insetShadowColor: string
}

export interface LayoutVibePill {
  label: string
  rect: LayoutRect
  fontSize: number
  fontFamily: string
  fontWeight: number
}

export interface LayoutBackground {
  base: string
  border: string
  highlightTopOpacity: number
  highlightHeightFraction: number
  onLight: boolean
}

/**
 * Fully resolved Stage card layout at a specific output width.
 * Suitable for canvas renderFrame() and React style derivation.
 *
 * Designed to extend toward resolveMomentLayout() + MomentTimeline without
 * a second layout system for MP4 / Animated Text.
 */
export interface ResolvedStageCardLayout {
  outputWidth: number
  outputHeight: number
  scale: number
  borderRadius: number
  padding: { top: number; right: number; bottom: number; left: number }
  contentWidth: number
  background: LayoutBackground
  theme: StageCardTheme
  lyric: LayoutLyricBlock
  meta: LayoutMetaBlock | null
  artwork: LayoutRect | null
  mark: LayoutMarkBadge
  vibePill: LayoutVibePill | null
}

export interface StageCardLayoutInput {
  /** Primary lyric — may contain intentional \\n */
  lyric: string
  songTitle?: string
  artistName?: string
  artworkUrl?: string | null
  vibeLabel?: string | null
  themeId?: string | null
  outputWidthPx: number
  /** When false, vibe pill is omitted from layout height (preview-only footers) */
  includeVibePill?: boolean
}

export type TextMeasureFn = (text: string, font: string) => number

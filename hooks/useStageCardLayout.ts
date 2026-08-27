'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LYRIC_FONT, UI_FONT } from '@/lib/fonts'
import {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
  STAGE_CARD_REF_WIDTH,
  type ResolvedStageCardLayout,
  type StageCardLayoutInput,
} from '@/lib/moment-export/layout'
import { getStageCardTheme } from '@/lib/moment/stage-theme'

export interface UseStageCardLayoutArgs {
  lyric: string
  songTitle: string
  artistName: string
  artworkUrl?: string | null
  vibeLabel?: string | null
  themeId?: string | null
  /** When false, omit export-style vibe pill from layout height */
  includeVibePill?: boolean
}

function defaultWidth(): number {
  if (typeof window === 'undefined') return STAGE_CARD_REF_WIDTH
  return Math.min(400, Math.max(280, window.innerWidth - 48))
}

/**
 * Measure card width and resolve shared Stage layout for React preview.
 * Uses the same resolver as Canvas export at the measured width.
 */
export function useStageCardLayout(
  args: UseStageCardLayoutArgs,
  containerWidth: number | null,
): ResolvedStageCardLayout | null {
  const [layout, setLayout] = useState<ResolvedStageCardLayout | null>(null)

  const width = containerWidth && containerWidth > 0 ? containerWidth : defaultWidth()

  const input = useMemo<StageCardLayoutInput>(() => ({
    lyric: args.lyric,
    songTitle: args.songTitle,
    artistName: args.artistName,
    artworkUrl: args.artworkUrl,
    vibeLabel: args.vibeLabel,
    themeId: args.themeId,
    outputWidthPx: width,
    includeVibePill: args.includeVibePill,
  }), [
    args.lyric,
    args.songTitle,
    args.artistName,
    args.artworkUrl,
    args.vibeLabel,
    args.themeId,
    args.includeVibePill,
    width,
  ])

  const resolve = useCallback(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const geist = UI_FONT.replace(/"/g, '')
    const measure = buildCanvasTextMeasure(ctx)
    return resolveStageCardLayout(input, measure, geist)
  }, [input])

  useEffect(() => {
    setLayout(resolve())
  }, [resolve])

  return layout
}

/** React inline styles derived from resolved layout (preview at measured width). */
export function stageCardShellStyle(layout: ResolvedStageCardLayout): React.CSSProperties {
  const theme = layout.theme
  const light = layout.background.onLight
  return {
    position: 'relative',
    textAlign: 'left',
    borderRadius: layout.borderRadius,
    padding: `${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`,
    background: `linear-gradient(180deg, rgba(255,255,255,${layout.background.highlightTopOpacity}) 0%, transparent ${layout.background.highlightHeightFraction * 100}%), ${layout.background.base}`,
    border: `1px solid ${layout.background.border}`,
    boxSizing: 'border-box',
    minHeight: layout.outputHeight,
  }
}

export function stageCardLyricStyle(layout: ResolvedStageCardLayout): React.CSSProperties {
  return {
    fontFamily: LYRIC_FONT,
    fontStyle: layout.lyric.style.fontStyle,
    fontSize: layout.lyric.style.fontSize,
    color: layout.lyric.style.color,
    lineHeight: layout.lyric.style.lineHeight,
    margin: 0,
    textAlign: 'left',
    whiteSpace: 'pre-line',
  }
}

export function stageCardMarkStyle(layout: ResolvedStageCardLayout): React.CSSProperties {
  const { container, insetShadowColor } = layout.mark
  const theme = layout.theme
  return {
    position: 'absolute',
    top: container.y,
    right: layout.outputWidth - container.x - container.width,
    width: container.width,
    height: container.height,
    borderRadius: '50%',
    background: theme.badgeFill,
    border: `1px solid ${theme.badgeStroke}`,
    boxShadow: `0 1px 0 ${insetShadowColor} inset`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  }
}

export function lyricDisplayText(layout: ResolvedStageCardLayout): string {
  return layout.lyric.displayLines.join('\n')
}

export function getStageCardThemeFromLayout(layout: ResolvedStageCardLayout) {
  return getStageCardTheme(layout.theme.id)
}

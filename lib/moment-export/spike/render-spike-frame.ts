/**
 * Spike frame renderer — deterministic frame at time T.
 * Reuses stage-card layout resolver + theme tokens; lyric words animated separately.
 */

import { getStageCardTheme } from '@/lib/moment/stage-theme'
import {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
} from '@/lib/moment-export/layout'
import type { SpikeMoment } from '@/lib/moment-export/spike/spike-moment'
import { spikeWords, SPIKE_VIDEO_HEIGHT, SPIKE_VIDEO_WIDTH } from '@/lib/moment-export/spike/spike-moment'

const MARGO_GOLD = '#E8C547'
const MARGO_INK = '#0B0B0D'

export interface SpikeFrameAssets {
  artworkImage: HTMLImageElement | null
  geistFamily: string
}

export interface SpikeAnimationConfig {
  bgFadeEnd: number
  wordRevealStart: number
  wordRevealSpan: number
  wordAnimDuration: number
  metaRevealStart: number
  metaAnimDuration: number
  vibeRevealStart: number
  endFadeStart: number
  endFadeDuration: number
}

export const DEFAULT_SPIKE_ANIMATION: SpikeAnimationConfig = {
  bgFadeEnd: 0.4,
  wordRevealStart: 0.3,
  wordRevealSpan: 3.2,
  wordAnimDuration: 0.28,
  metaRevealStart: 5.8,
  metaAnimDuration: 0.5,
  vibeRevealStart: 6.4,
  endFadeStart: 9.0,
  endFadeDuration: 1.0,
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function resolveGeistFontFamily(): string {
  if (typeof document === 'undefined') return 'system-ui, sans-serif'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-sans').trim()
  return v ? `${v}, sans-serif` : 'system-ui, sans-serif'
}

async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined') return
  try {
    await (document as Document & { fonts: FontFaceSet }).fonts.ready
  } catch {
    /* ignore */
  }
}

export async function loadSpikeArtwork(url: string | null): Promise<HTMLImageElement | null> {
  if (!url || typeof document === 'undefined') return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export async function createSpikeFrameAssets(
  moment: SpikeMoment,
): Promise<SpikeFrameAssets> {
  await waitForFonts()
  return {
    artworkImage: await loadSpikeArtwork(moment.artworkUrl),
    geistFamily: resolveGeistFontFamily(),
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawMargoSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  variant: 'on-dark' | 'on-light',
) {
  const circleColor = variant === 'on-light' ? MARGO_INK : MARGO_GOLD
  const markColor = variant === 'on-light' ? MARGO_GOLD : MARGO_INK
  const r = size / 2
  const cx = x + r
  const cy = y + r
  const sc = size / 80

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = circleColor
  ctx.fill()
  ctx.strokeStyle = markColor
  ctx.lineWidth = 5 * sc
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx + (17 - 40) * sc, cy + (57 - 40) * sc)
  ctx.lineTo(cx + (17 - 40) * sc, cy + (27 - 40) * sc)
  ctx.lineTo(cx + (29 - 40) * sc, cy + (45 - 40) * sc)
  ctx.lineTo(cx + (40 - 40) * sc, cy + (26 - 40) * sc)
  ctx.lineTo(cx + (51 - 40) * sc, cy + (45 - 40) * sc)
  ctx.lineTo(cx + (63 - 40) * sc, cy + (27 - 40) * sc)
  ctx.lineTo(cx + (63 - 40) * sc, cy + (57 - 40) * sc)
  ctx.stroke()
  ctx.fillStyle = markColor
  ctx.globalAlpha = 0.55
  const dw = 10 * sc
  const dh = 3.5 * sc
  ctx.beginPath()
  ctx.roundRect(cx - dw / 2, cy + (60 - 40) * sc - dh / 2, dw, dh, 1.75 * sc)
  ctx.fill()
  ctx.restore()
}

function wordProgress(
  timeSec: number,
  wordIndex: number,
  wordCount: number,
  anim: SpikeAnimationConfig,
): number {
  if (wordCount <= 0) return 1
  const slot = anim.wordRevealSpan / wordCount
  const start = anim.wordRevealStart + wordIndex * slot
  return easeOutCubic(clamp01((timeSec - start) / anim.wordAnimDuration))
}

function globalAlphaAt(timeSec: number, anim: SpikeAnimationConfig): number {
  const bg = easeOutCubic(clamp01(timeSec / anim.bgFadeEnd))
  const endFade = timeSec >= anim.endFadeStart
    ? 1 - easeOutCubic(clamp01((timeSec - anim.endFadeStart) / anim.endFadeDuration))
    : 1
  return bg * endFade
}

function metaProgress(timeSec: number, anim: SpikeAnimationConfig): number {
  return easeOutCubic(clamp01((timeSec - anim.metaRevealStart) / anim.metaAnimDuration))
}

function vibeProgress(timeSec: number, anim: SpikeAnimationConfig): number {
  return easeOutCubic(clamp01((timeSec - anim.vibeRevealStart) / anim.metaAnimDuration))
}

/**
 * Paint one frame at `timeSec` onto a 1080×1920 canvas context.
 */
export function renderSpikeFrame(
  ctx: CanvasRenderingContext2D,
  moment: SpikeMoment,
  assets: SpikeFrameAssets,
  layout: ReturnType<typeof resolveStageCardLayout>,
  timeSec: number,
  anim: SpikeAnimationConfig = DEFAULT_SPIKE_ANIMATION,
): void {
  const W = SPIKE_VIDEO_WIDTH
  const H = SPIKE_VIDEO_HEIGHT
  const theme = getStageCardTheme(moment.themeId)
  const alpha = globalAlphaAt(timeSec, anim)
  const words = spikeWords(moment.lyric)

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, W, H)

  // Background — theme base + optional blurred artwork
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, W, H)

  if (assets.artworkImage) {
    const bgAlpha = 0.22 * easeOutCubic(clamp01(timeSec / anim.bgFadeEnd))
    ctx.save()
    ctx.globalAlpha = bgAlpha
    const scale = 1.05 + 0.02 * easeOutCubic(clamp01(timeSec / 4))
    const iw = assets.artworkImage.width
    const ih = assets.artworkImage.height
    const coverScale = Math.max(W / iw, H / ih) * scale
    const dw = iw * coverScale
    const dh = ih * coverScale
    ctx.filter = 'blur(28px) brightness(0.55)'
    ctx.drawImage(assets.artworkImage, (W - dw) / 2, (H - dh) / 2, dw, dh)
    ctx.filter = 'none'
    ctx.restore()
  }

  const vignette = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.1, W / 2, H * 0.42, H * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, H)

  // Stage card — centered in upper-middle of vertical frame
  const cardW = layout.outputWidth
  const cardH = layout.outputHeight
  const cardX = (W - cardW) / 2
  const cardY = Math.round(H * 0.22)

  ctx.save()
  ctx.globalAlpha = alpha

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, layout.borderRadius)
  ctx.clip()
  ctx.fillStyle = layout.background.base
  ctx.fillRect(cardX, cardY, cardW, cardH)

  const highlight = ctx.createLinearGradient(0, cardY, 0, cardY + cardH * layout.background.highlightHeightFraction)
  highlight.addColorStop(0, `rgba(255,255,255,${layout.background.highlightTopOpacity})`)
  highlight.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = highlight
  ctx.fillRect(cardX, cardY, cardW, cardH * layout.background.highlightHeightFraction)

  ctx.restore()

  ctx.strokeStyle = layout.background.border
  ctx.lineWidth = 1
  drawRoundedRect(ctx, cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, layout.borderRadius)
  ctx.stroke()

  // Mark badge
  const mark = layout.mark
  const mcx = cardX + mark.container.x + mark.container.width / 2
  const mcy = cardY + mark.container.y + mark.container.height / 2
  const mr = mark.container.width / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(mcx, mcy, mr, 0, Math.PI * 2)
  ctx.fillStyle = theme.badgeFill
  ctx.fill()
  ctx.strokeStyle = theme.badgeStroke
  ctx.lineWidth = 1
  ctx.stroke()
  const symbolX = cardX + mark.container.x + (mark.container.width - mark.symbolSize) / 2
  const symbolY = cardY + mark.container.y + (mark.container.height - mark.symbolSize) / 2
  drawMargoSymbol(ctx, symbolX, symbolY, mark.symbolSize, theme.markVariant)
  ctx.restore()

  // Lyric — word by word
  const lyric = layout.lyric
  const lyricFont = `${lyric.style.fontStyle} ${lyric.style.fontSize}px ${lyric.style.fontFamily}`
  ctx.font = lyricFont
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  const lineY = cardY + lyric.y + lyric.style.fontSize * 0.92
  const lineH = lyric.style.fontSize * lyric.style.lineHeight
  let cursorX = cardX + lyric.x
  const maxRight = cardX + lyric.x + lyric.maxWidth

  for (let i = 0; i < words.length; i++) {
    const p = wordProgress(timeSec, i, words.length, anim)
    if (p <= 0) continue

    const word = words[i]
    const space = i < words.length - 1 ? ' ' : ''
    const w = ctx.measureText(word + space).width

    if (cursorX + w > maxRight && i > 0) {
      cursorX = cardX + lyric.x
    }

    const lift = (1 - p) * 14
    ctx.save()
    ctx.globalAlpha = alpha * p
    ctx.fillStyle = lyric.style.color
    ctx.fillText(word + space, cursorX, lineY - lift)
    ctx.restore()

    cursorX += w
  }

  // Meta — song / artist
  const metaP = metaProgress(timeSec, anim)
  if (layout.meta && metaP > 0) {
    ctx.save()
    ctx.globalAlpha = alpha * metaP
    if (layout.meta.song) {
      const s = layout.meta.song
      ctx.font = `${s.style.fontWeight} ${s.style.fontSize}px ${s.style.fontFamily}`
      ctx.fillStyle = s.style.color
      const lift = (1 - metaP) * 10
      ctx.fillText(s.text, cardX + layout.padding.left, cardY + s.y + s.style.fontSize - lift)
    }
    if (layout.meta.artist) {
      const a = layout.meta.artist
      ctx.font = `${a.style.fontWeight} ${a.style.fontSize}px ${a.style.fontFamily}`
      ctx.fillStyle = a.style.color
      const lift = (1 - metaP) * 10
      ctx.fillText(a.text, cardX + layout.padding.left, cardY + a.y + a.style.fontSize - lift)
    }
    ctx.restore()
  }

  // Vibe pill
  const vibeP = vibeProgress(timeSec, anim)
  if (layout.vibePill && vibeP > 0) {
    const pill = layout.vibePill
    const { x, y, width, height } = pill.rect
    const px = cardX + x
    const py = cardY + y
    const r = height / 2
    ctx.save()
    ctx.globalAlpha = alpha * vibeP
    const tagFill = theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.08)' : 'rgba(255,255,255,0.1)'
    const tagStroke = theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.18)' : 'rgba(255,255,255,0.2)'
    ctx.beginPath()
    ctx.moveTo(px + r, py)
    ctx.lineTo(px + width - r, py)
    ctx.quadraticCurveTo(px + width, py, px + width, py + r)
    ctx.lineTo(px + width, py + height - r)
    ctx.quadraticCurveTo(px + width, py + height, px + width - r, py + height)
    ctx.lineTo(px + r, py + height)
    ctx.quadraticCurveTo(px, py + height, px, py + height - r)
    ctx.lineTo(px, py + r)
    ctx.quadraticCurveTo(px, py, px + r, py)
    ctx.closePath()
    ctx.fillStyle = tagFill
    ctx.fill()
    ctx.strokeStyle = tagStroke
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = theme.ink
    ctx.font = `${pill.fontWeight} ${pill.fontSize}px ${pill.fontFamily}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(pill.label, px + width / 2, py + height / 2 + 0.5)
    ctx.restore()
  }

  // Footer watermark
  ctx.save()
  ctx.globalAlpha = alpha * 0.7
  ctx.font = `400 ${Math.round(W * 0.022)}px ${assets.geistFamily}`
  ctx.fillStyle = theme.inkMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('trymargo.com', W / 2, H - Math.round(H * 0.06))
  ctx.restore()

  ctx.restore()
}

export function resolveSpikeCardLayout(
  moment: SpikeMoment,
  assets: SpikeFrameAssets,
  cardWidth = 920,
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d unavailable')
  const measure = buildCanvasTextMeasure(ctx)
  return resolveStageCardLayout({
    lyric: moment.lyric,
    songTitle: moment.songTitle,
    artistName: moment.artistName,
    artworkUrl: moment.artworkUrl,
    vibeLabel: moment.vibeLabel,
    themeId: moment.themeId,
    outputWidthPx: cardWidth,
    includeVibePill: true,
  }, measure, assets.geistFamily)
}

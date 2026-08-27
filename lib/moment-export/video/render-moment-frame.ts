import type { MomentTimeline } from '@/lib/moment-export/timeline/types'
import { wordRevealProgress } from '@/lib/moment-export/timeline/build-moment-timeline'
import { clamp01, easeOutCubic, windowProgress } from '@/lib/moment-export/timeline/interpolate'
import type { ResolvedVerticalMomentLayout } from '@/lib/moment-export/layout/resolve-vertical-layout'
import type { LayoutLyricBlock } from '@/lib/moment-export/layout/types'
import type { StageCardTheme } from '@/lib/moment/stage-theme'

const MARGO_GOLD = '#E8C547'
const MARGO_INK = '#0B0B0D'

export interface MomentFrameAssets {
  artworkImage: HTMLImageElement | null
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

function drawMarkBadge(
  ctx: CanvasRenderingContext2D,
  layout: ResolvedVerticalMomentLayout,
  theme: StageCardTheme,
  alpha: number,
) {
  const { container, symbolSize, insetShadowColor } = layout.mark
  const cx = container.x + container.width / 2
  const cy = container.y + container.height / 2
  const r = container.width / 2

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = theme.badgeFill
  ctx.fill()
  ctx.strokeStyle = theme.badgeStroke
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.save()
  ctx.clip()
  ctx.strokeStyle = insetShadowColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  const symbolX = container.x + (container.width - symbolSize) / 2
  const symbolY = container.y + (container.height - symbolSize) / 2
  drawMargoSymbol(ctx, symbolX, symbolY, symbolSize, theme.markVariant)
  ctx.restore()
}

function drawVibePill(
  ctx: CanvasRenderingContext2D,
  layout: ResolvedVerticalMomentLayout,
  theme: StageCardTheme,
  alpha: number,
) {
  const pill = layout.vibePill
  if (!pill || alpha <= 0) return

  const { x, y, width, height } = pill.rect
  const r = height / 2
  const tagFill = theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.08)' : 'rgba(255,255,255,0.1)'
  const tagStroke = theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.18)' : 'rgba(255,255,255,0.2)'

  ctx.save()
  ctx.globalAlpha = alpha
  drawRoundedRect(ctx, x, y, width, height, r)
  ctx.fillStyle = tagFill
  ctx.fill()
  ctx.strokeStyle = tagStroke
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.fillStyle = theme.ink
  ctx.font = `${pill.fontWeight} ${pill.fontSize}px ${pill.fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pill.label, x + width / 2, y + height / 2 + 0.5)
  ctx.restore()
}

function computeWordPositions(
  ctx: CanvasRenderingContext2D,
  lyric: LayoutLyricBlock,
  words: MomentTimeline['words'],
): Array<{ x: number; y: number; timing: MomentTimeline['words'][number] }> {
  const font = `${lyric.style.fontStyle} ${lyric.style.fontSize}px ${lyric.style.fontFamily}`
  ctx.font = font
  const linePx = lyric.style.fontSize * lyric.style.lineHeight
  const positions: Array<{ x: number; y: number; timing: MomentTimeline['words'][number] }> = []
  let wordIdx = 0
  let lineY = lyric.y

  for (const line of lyric.displayLines) {
    if (line === '') {
      lineY += linePx
      continue
    }
    const baseline = lineY + lyric.style.fontSize * 0.92
    let x = lyric.x
    for (const token of line.split(/\s+/).filter(Boolean)) {
      if (wordIdx >= words.length) return positions
      positions.push({ x, y: baseline, timing: words[wordIdx] })
      x += ctx.measureText(token + ' ').width
      wordIdx++
    }
    lineY += linePx
  }

  return positions
}

function globalAlphaAt(timeSec: number, timeline: MomentTimeline): number {
  const bg = easeOutCubic(clamp01(timeSec / timeline.bgFadeEndSec))
  const endFade = timeSec >= timeline.endFadeStartSec
    ? 1 - easeOutCubic((timeSec - timeline.endFadeStartSec) / timeline.endFadeDurationSec)
    : 1
  return bg * endFade
}

function artworkScaleAt(timeSec: number, timeline: MomentTimeline): number {
  const t = clamp01(timeSec / timeline.durationSec)
  return timeline.artworkScaleStart
    + (timeline.artworkScaleEnd - timeline.artworkScaleStart) * easeOutCubic(t)
}

/**
 * Deterministic frame renderer — same inputs always produce the same pixels at timeSec.
 */
export function renderMomentFrame(
  ctx: CanvasRenderingContext2D,
  layout: ResolvedVerticalMomentLayout,
  timeline: MomentTimeline,
  assets: MomentFrameAssets,
  timeSec: number,
): void {
  const W = layout.outputWidth
  const H = layout.outputHeight
  const theme = layout.theme
  const alpha = globalAlphaAt(timeSec, timeline)
  const light = layout.background.onLight

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, W, H)

  ctx.fillStyle = layout.background.base
  ctx.fillRect(0, 0, W, H)

  if (assets.artworkImage) {
    const bgAlpha = 0.26 * easeOutCubic(clamp01(timeSec / timeline.bgFadeEndSec))
    const scale = artworkScaleAt(timeSec, timeline)
    ctx.save()
    ctx.globalAlpha = bgAlpha
    const img = assets.artworkImage
    const coverScale = Math.max(W / img.width, H / img.height) * scale
    const dw = img.width * coverScale
    const dh = img.height * coverScale
    ctx.filter = 'blur(32px) brightness(0.5)'
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
    ctx.filter = 'none'
    ctx.restore()
  }

  const vignette = ctx.createRadialGradient(W / 2, H * 0.38, H * 0.08, W / 2, H * 0.38, H * 0.78)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.38)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, H)

  const panel = layout.panel
  ctx.save()
  ctx.globalAlpha = alpha * 0.98
  drawRoundedRect(ctx, panel.x, panel.y, panel.width, panel.height, panel.borderRadius)
  ctx.fillStyle = layout.background.base
  ctx.fill()
  const highlight = ctx.createLinearGradient(0, panel.y, 0, panel.y + panel.height * layout.background.highlightHeightFraction)
  highlight.addColorStop(0, `rgba(255,255,255,${layout.background.highlightTopOpacity})`)
  highlight.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = highlight
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height * layout.background.highlightHeightFraction)
  ctx.strokeStyle = layout.background.border
  ctx.lineWidth = 1
  drawRoundedRect(ctx, panel.x + 0.5, panel.y + 0.5, panel.width - 1, panel.height - 1, panel.borderRadius)
  ctx.stroke()
  ctx.restore()

  drawMarkBadge(ctx, layout, theme, alpha)

  const lyric = layout.lyric
  ctx.font = `${lyric.style.fontStyle} ${lyric.style.fontSize}px ${lyric.style.fontFamily}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  const wordPositions = computeWordPositions(ctx, lyric, timeline.words)
  for (const { x, y, timing } of wordPositions) {
    const p = wordRevealProgress(timeSec, timing)
    if (p <= 0) continue

    const word = timing.word
    const space = ' '
    const lift = (1 - p) * 12
    const emphasisScale = timing.emphasis ? 1 + p * 0.02 : 1

    ctx.save()
    ctx.globalAlpha = alpha * p
    ctx.fillStyle = timing.emphasis && theme.markVariant === 'on-dark'
      ? MARGO_GOLD
      : lyric.style.color
    if (emphasisScale !== 1) {
      ctx.translate(x, y - lift)
      ctx.scale(emphasisScale, emphasisScale)
      ctx.fillText(word + space, 0, 0)
    } else {
      ctx.fillText(word + space, x, y - lift)
    }
    ctx.restore()
  }

  const metaP = windowProgress(timeSec, timeline.metaRevealStartSec, timeline.metaRevealDurationSec)
  if (layout.meta && metaP > 0) {
    ctx.save()
    ctx.globalAlpha = alpha * metaP
    const lift = (1 - metaP) * 8
    if (layout.meta.song) {
      const s = layout.meta.song
      ctx.font = `${s.style.fontWeight} ${s.style.fontSize}px ${s.style.fontFamily}`
      ctx.fillStyle = s.style.color
      ctx.fillText(s.text, lyric.x, s.y + s.style.fontSize - lift)
    }
    if (layout.meta.artist) {
      const a = layout.meta.artist
      ctx.font = `${a.style.fontWeight} ${a.style.fontSize}px ${a.style.fontFamily}`
      ctx.fillStyle = a.style.color
      ctx.fillText(a.text, lyric.x, a.y + a.style.fontSize - lift)
    }
    ctx.restore()
  }

  if (layout.artwork && assets.artworkImage) {
    const art = layout.artwork
    const artP = windowProgress(
      timeSec,
      timeline.metaRevealStartSec + timeline.metaRevealDurationSec * 0.35,
      timeline.metaRevealDurationSec,
    )
    if (artP > 0) {
      const radius = art.width * (8 / 48)
      ctx.save()
      ctx.globalAlpha = alpha * artP
      ctx.beginPath()
      ctx.roundRect(art.x, art.y - (1 - artP) * 6, art.width, art.height, radius)
      ctx.clip()
      ctx.drawImage(assets.artworkImage, art.x, art.y - (1 - artP) * 6, art.width, art.height)
      ctx.restore()
    }
  }

  const vibeP = windowProgress(timeSec, timeline.vibeRevealStartSec, timeline.vibeRevealDurationSec)
  drawVibePill(ctx, layout, theme, alpha * vibeP)

  ctx.save()
  ctx.globalAlpha = alpha * 0.65
  ctx.font = `400 ${Math.round(W * 0.022)}px ${layout.geistFamily}`
  ctx.fillStyle = theme.inkMuted
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('trymargo.com', W / 2, layout.watermarkY)
  ctx.restore()
}

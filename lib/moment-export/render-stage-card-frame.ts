import type { StageCardTheme } from '@/lib/moment/stage-theme'
import type { ResolvedStageCardLayout } from '@/lib/moment-export/layout/types'

const MARGO_GOLD = '#E8C547'
const MARGO_INK = '#0B0B0D'

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
  layout: ResolvedStageCardLayout,
  theme: StageCardTheme,
) {
  const { container, symbolSize, insetShadowColor } = layout.mark
  const cx = container.x + container.width / 2
  const cy = container.y + container.height / 2
  const r = container.width / 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = theme.badgeFill
  ctx.fill()
  ctx.strokeStyle = theme.badgeStroke
  ctx.lineWidth = 1
  ctx.stroke()

  // Inset highlight — matches React boxShadow on mark badge
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
  layout: ResolvedStageCardLayout,
  theme: StageCardTheme,
) {
  const pill = layout.vibePill
  if (!pill) return

  const { x, y, width, height } = pill.rect
  const r = height / 2
  const tagFill = theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.08)' : 'rgba(255,255,255,0.1)'
  const tagStroke = theme.markVariant === 'on-light' ? 'rgba(7,6,10,0.18)' : 'rgba(255,255,255,0.2)'

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
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
  ctx.fillText(pill.label, x + width / 2, y + height / 2 + 0.5)
  ctx.restore()
}

export interface StageCardFrameAssets {
  artworkImage?: HTMLImageElement | null
}

/**
 * Paint a resolved Stage card layout — drawing only, no layout math.
 * Future MP4 / Animated Text will call renderFrame(layout, time) here.
 */
export function renderStageCardFrame(
  ctx: CanvasRenderingContext2D,
  layout: ResolvedStageCardLayout,
  assets: StageCardFrameAssets = {},
): void {
  const { outputWidth: W, outputHeight: H, theme } = layout
  const light = layout.background.onLight

  ctx.fillStyle = layout.background.base
  ctx.fillRect(0, 0, W, H)
  const highlight = ctx.createLinearGradient(0, 0, 0, H * layout.background.highlightHeightFraction)
  highlight.addColorStop(0, `rgba(255,255,255,${layout.background.highlightTopOpacity})`)
  highlight.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = highlight
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = layout.background.border
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)

  drawMarkBadge(ctx, layout, theme)

  const { lyric } = layout
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `${lyric.style.fontStyle} ${lyric.style.fontSize}px ${lyric.style.fontFamily}`
  ctx.fillStyle = lyric.style.color
  const linePx = lyric.style.fontSize * lyric.style.lineHeight
  let y = lyric.y
  for (const line of lyric.displayLines) {
    if (line === '') {
      y += linePx
      continue
    }
    y += lyric.style.fontSize * 0.92
    ctx.fillText(line, lyric.x, y)
    y += linePx - lyric.style.fontSize * 0.92
  }

  if (layout.meta) {
    if (layout.meta.song) {
      const s = layout.meta.song
      ctx.font = `${s.style.fontWeight} ${s.style.fontSize}px ${s.style.fontFamily}`
      ctx.fillStyle = s.style.color
      ctx.fillText(s.text, layout.padding.left, s.y + s.style.fontSize)
    }
    if (layout.meta.artist) {
      const a = layout.meta.artist
      ctx.font = `${a.style.fontWeight} ${a.style.fontSize}px ${a.style.fontFamily}`
      ctx.fillStyle = a.style.color
      ctx.fillText(a.text, layout.padding.left, a.y + a.style.fontSize)
    }
  }

  if (layout.artwork) {
    const art = layout.artwork
    const radius = art.width * (8 / 48)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(art.x, art.y, art.width, art.height, radius)
    if (assets.artworkImage) {
      ctx.clip()
      ctx.drawImage(assets.artworkImage, art.x, art.y, art.width, art.height)
    } else {
      ctx.fillStyle = light ? 'rgba(7,6,10,0.1)' : 'rgba(255,255,255,0.08)'
      ctx.fill()
    }
    ctx.restore()
  }

  drawVibePill(ctx, layout, theme)
}

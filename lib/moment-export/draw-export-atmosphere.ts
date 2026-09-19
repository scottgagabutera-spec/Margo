import type { AtmosphereId } from '@/lib/atmosphere'
import { isLivingAtmosphere } from '@/lib/atmosphere'

const GOLD = '#E8C547'
const INK = '#07060A'

function roundedClip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  if (r <= 0) {
    ctx.rect(0, 0, w, h)
  } else {
    ctx.moveTo(r, 0)
    ctx.lineTo(w - r, 0)
    ctx.quadraticCurveTo(w, 0, w, r)
    ctx.lineTo(w, h - r)
    ctx.quadraticCurveTo(w, h, w - r, h)
    ctx.lineTo(r, h)
    ctx.quadraticCurveTo(0, h, 0, h - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
  }
  ctx.closePath()
  ctx.clip()
}

/**
 * Canvas atmosphere — same path for preview, PNG, GIF, and MP4.
 *
 * Contrast-stage approach (not a color override): keep the chosen color as
 * the room, mute it just enough that Margo gold motion always reads on gold,
 * blush, sage, and dusk. Effect quality can get a later pass; visibility
 * is the job here.
 */
export function drawExportAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  id: AtmosphereId,
  timeSec = 0,
  borderRadius = 16,
  alpha = 1,
  onLight = false,
): void {
  if (!isLivingAtmosphere(id)) return

  const accent = GOLD
  const accentRgb = '232,197,71'
  const veil = onLight ? 0.30 : 0.18

  ctx.save()
  roundedClip(ctx, w, h, borderRadius)

  ctx.globalAlpha = alpha * veil
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, w, h)

  if (id === 'breath') {
    const phase = (timeSec % 7.4) / 7.4
    const wash = 0.16 + Math.sin(phase * Math.PI * 2) * 0.14
    ctx.fillStyle = accent
    ctx.globalAlpha = alpha * wash
    ctx.fillRect(0, 0, w, h)
    const stretch = 0.45 + Math.sin(phase * Math.PI * 2) * 0.28
    ctx.globalAlpha = alpha * stretch
    ctx.fillStyle = accent
    for (let y = 0; y < h; y += 16) {
      ctx.fillRect(0, y, w, 2)
    }
  }

  if (id === 'drift') {
    const phase = (timeSec % 8.2) / 8.2
    const x = -w * 0.4 + phase * w * 1.5
    const grad = ctx.createLinearGradient(x, 0, x + w * 0.5, 0)
    grad.addColorStop(0, `rgba(${accentRgb},0)`)
    grad.addColorStop(0.42, `rgba(${accentRgb},0.42)`)
    grad.addColorStop(0.5, `rgba(${accentRgb},0.58)`)
    grad.addColorStop(0.58, `rgba(${accentRgb},0.28)`)
    grad.addColorStop(1, `rgba(${accentRgb},0)`)
    ctx.globalAlpha = alpha
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  if (id === 'pulse') {
    const phase = (timeSec % 2.9) / 2.9
    const hit = phase < 0.16 ? 0.38 : phase < 0.26 ? 0.12 : phase < 0.36 ? 0.28 : 0.08
    ctx.fillStyle = accent
    ctx.globalAlpha = alpha * hit
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = alpha
    ctx.strokeStyle = `rgba(${accentRgb},${0.45 + hit * 0.45})`
    ctx.lineWidth = Math.max(3, Math.round(Math.min(w, h) * 0.012))
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2)
    ctx.shadowColor = `rgba(${accentRgb},0.65)`
    ctx.shadowBlur = 22 + hit * 50
    ctx.strokeRect(ctx.lineWidth * 2, ctx.lineWidth * 2, w - ctx.lineWidth * 4, h - ctx.lineWidth * 4)
    ctx.shadowBlur = 0
  }

  if (id === 'weight') {
    const floorGrad = ctx.createRadialGradient(w * 0.5, h * 0.94, 0, w * 0.5, h * 0.94, w * 0.7)
    floorGrad.addColorStop(0, `rgba(${accentRgb},0.42)`)
    floorGrad.addColorStop(1, `rgba(${accentRgb},0)`)
    ctx.globalAlpha = alpha
    ctx.fillStyle = floorGrad
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 12; i++) {
      const seed = i * 1.37
      const dropPhase = (timeSec * 0.38 + seed) % 1
      const x = (0.07 + (i * 0.078) % 0.86) * w
      const y = dropPhase * h * 1.12 - h * 0.06
      const dropW = w * 0.018
      const dropH = h * 0.055
      ctx.globalAlpha = alpha * (0.25 + 0.7 * (1 - dropPhase))
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.ellipse(x, y, dropW, dropH, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

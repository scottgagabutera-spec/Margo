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
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.quadraticCurveTo(w, 0, w, r)
  ctx.lineTo(w, h - r)
  ctx.quadraticCurveTo(w, h, w - r, h)
  ctx.lineTo(r, h)
  ctx.quadraticCurveTo(0, h, 0, h - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.clip()
}

/** Canvas atmosphere layer — mirrors in-app rooms for PNG / video export. */
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

  const accent = onLight ? INK : GOLD
  const accentRgb = onLight ? '7,6,10' : '232,197,71'

  ctx.save()
  roundedClip(ctx, w, h, borderRadius)
  ctx.globalAlpha = alpha

  if (id === 'breath') {
    const phase = (timeSec % 7.4) / 7.4
    const wash = 0.035 + Math.sin(phase * Math.PI * 2) * 0.06
    ctx.fillStyle = accent
    ctx.globalAlpha = alpha * wash
    ctx.fillRect(0, 0, w, h)
    const stretch = 0.28 + Math.sin(phase * Math.PI * 2) * 0.21
    ctx.globalAlpha = alpha * stretch * 0.35
    for (let y = 0; y < h; y += 18) {
      ctx.fillStyle = accent
      ctx.fillRect(0, y, w, 1)
    }
  }

  if (id === 'drift') {
    const phase = (timeSec % 8.2) / 8.2
    const x = -w * 0.35 + phase * w * 1.35
    const grad = ctx.createLinearGradient(x, 0, x + w * 0.55, 0)
    grad.addColorStop(0, `rgba(${accentRgb},0)`)
    grad.addColorStop(0.45, `rgba(${accentRgb},0.14)`)
    grad.addColorStop(0.55, `rgba(${accentRgb},0.08)`)
    grad.addColorStop(1, `rgba(${accentRgb},0)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  if (id === 'pulse') {
    const phase = (timeSec % 2.9) / 2.9
    const hit = phase < 0.14 ? 0.16 : phase < 0.24 ? 0.05 : phase < 0.32 ? 0.12 : 0.03
    ctx.fillStyle = accent
    ctx.globalAlpha = alpha * hit
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = `rgba(${accentRgb},${0.18 + hit * 0.5})`
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1)
    ctx.shadowColor = `rgba(${accentRgb},0.35)`
    ctx.shadowBlur = 18 + hit * 40
    ctx.strokeRect(2, 2, w - 4, h - 4)
    ctx.shadowBlur = 0
  }

  if (id === 'weight') {
    const floorGrad = ctx.createRadialGradient(w * 0.5, h * 0.92, 0, w * 0.5, h * 0.92, w * 0.55)
    floorGrad.addColorStop(0, `rgba(${accentRgb},0.16)`)
    floorGrad.addColorStop(1, `rgba(${accentRgb},0)`)
    ctx.fillStyle = floorGrad
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 8; i++) {
      const seed = i * 1.37
      const dropPhase = (timeSec * 0.35 + seed) % 1
      const x = (0.08 + (i * 0.11) % 0.84) * w
      const y = dropPhase * h * 1.1 - h * 0.08
      const dropH = h * 0.04
      ctx.fillStyle = `rgba(${accentRgb},${0.35 * (1 - dropPhase)})`
      ctx.beginPath()
      ctx.ellipse(x, y, w * 0.012, dropH, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

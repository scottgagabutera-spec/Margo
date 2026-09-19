import type { AtmosphereId } from '@/lib/atmosphere'
import { isLivingAtmosphere } from '@/lib/atmosphere'

/** Brand gold — canvas cannot use CSS variables. */
const GOLD = '#E8C547'
const GOLD_RGB: [number, number, number] = [232, 197, 71]
const CREAM = '#FFF6D6'
const CREAM_RGB: [number, number, number] = [255, 246, 214]
const INK = '#07060A'
const INK_RGB: [number, number, number] = [7, 6, 10]

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

function parseHexRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim()
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ]
  }
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) return null
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbCss(rgb: [number, number, number]): string {
  return `${rgb[0]},${rgb[1]},${rgb[2]}`
}

/**
 * Gold-on-gold is the failure case: the Gold theme *is* Margo gold.
 * When the room is too close to gold, the light pass becomes cream
 * (brighter than the field). Every effect also paints an ink pass so
 * motion reads on light rooms without replacing the chosen color.
 */
function resolveEffectPaint(roomColor: string | undefined, onLight: boolean) {
  const room = roomColor ? parseHexRgb(roomColor) : null
  const goldTooClose = room
    ? Math.hypot(room[0] - GOLD_RGB[0], room[1] - GOLD_RGB[1], room[2] - GOLD_RGB[2]) < 90
    : false
  const lightRgb = goldTooClose ? CREAM_RGB : GOLD_RGB
  const lightHex = goldTooClose ? CREAM : GOLD
  return {
    lightHex,
    lightRgb: rgbCss(lightRgb),
    darkHex: INK,
    darkRgb: rgbCss(INK_RGB),
    veil: onLight ? (goldTooClose ? 0.14 : 0.22) : 0.12,
  }
}

/**
 * Canvas atmosphere — same path for preview, PNG, GIF, and MP4.
 *
 * Keep Color as the room (not an override). Dual-key motion — ink + a
 * contrast-locked light pigment — so the active effect reads on gold,
 * blush, sage, and dusk. Quality can get a later pass; visibility is
 * the job here.
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
  roomColor?: string,
): void {
  if (!isLivingAtmosphere(id)) return

  const paint = resolveEffectPaint(roomColor, onLight)
  const { lightHex, lightRgb, darkHex, darkRgb, veil } = paint

  ctx.save()
  roundedClip(ctx, w, h, borderRadius)

  ctx.globalAlpha = alpha * veil
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, w, h)

  if (id === 'breath') {
    const phase = (timeSec % 7.4) / 7.4
    const wave = Math.sin(phase * Math.PI * 2)
    ctx.fillStyle = darkHex
    ctx.globalAlpha = alpha * (0.16 + wave * 0.10)
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = lightHex
    ctx.globalAlpha = alpha * (0.22 + wave * 0.16)
    ctx.fillRect(0, 0, w, h)
    const gap = Math.max(10, Math.round(h / 28))
    const lineH = Math.max(2, Math.round(h * 0.006))
    for (let y = 0; y < h; y += gap) {
      ctx.fillStyle = darkHex
      ctx.globalAlpha = alpha * (0.28 + wave * 0.12)
      ctx.fillRect(0, y, w, lineH)
      ctx.fillStyle = lightHex
      ctx.globalAlpha = alpha * (0.55 + wave * 0.22)
      ctx.fillRect(0, y + lineH, w, lineH)
    }
  }

  if (id === 'drift') {
    const phase = (timeSec % 8.2) / 8.2
    const x = -w * 0.45 + phase * w * 1.7
    const dark = ctx.createLinearGradient(x - w * 0.08, 0, x + w * 0.52, 0)
    dark.addColorStop(0, `rgba(${darkRgb},0)`)
    dark.addColorStop(0.4, `rgba(${darkRgb},0.42)`)
    dark.addColorStop(0.55, `rgba(${darkRgb},0.18)`)
    dark.addColorStop(1, `rgba(${darkRgb},0)`)
    ctx.globalAlpha = alpha
    ctx.fillStyle = dark
    ctx.fillRect(0, 0, w, h)
    const light = ctx.createLinearGradient(x, 0, x + w * 0.48, 0)
    light.addColorStop(0, `rgba(${lightRgb},0)`)
    light.addColorStop(0.4, `rgba(${lightRgb},0.55)`)
    light.addColorStop(0.5, `rgba(${lightRgb},0.82)`)
    light.addColorStop(0.62, `rgba(${lightRgb},0.38)`)
    light.addColorStop(1, `rgba(${lightRgb},0)`)
    ctx.fillStyle = light
    ctx.fillRect(0, 0, w, h)
  }

  if (id === 'pulse') {
    const phase = (timeSec % 2.9) / 2.9
    const hit = phase < 0.16 ? 0.55 : phase < 0.26 ? 0.16 : phase < 0.36 ? 0.40 : 0.10
    ctx.fillStyle = darkHex
    ctx.globalAlpha = alpha * hit * 0.55
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = lightHex
    ctx.globalAlpha = alpha * hit
    ctx.fillRect(0, 0, w, h)
    const lw = Math.max(3, Math.round(Math.min(w, h) * 0.014))
    ctx.globalAlpha = alpha
    ctx.lineWidth = lw
    ctx.strokeStyle = `rgba(${darkRgb},${0.35 + hit * 0.4})`
    ctx.strokeRect(lw, lw, w - lw * 2, h - lw * 2)
    ctx.shadowColor = `rgba(${lightRgb},0.85)`
    ctx.shadowBlur = 18 + hit * 56
    ctx.strokeStyle = `rgba(${lightRgb},${0.55 + hit * 0.4})`
    ctx.strokeRect(lw * 2, lw * 2, w - lw * 4, h - lw * 4)
    ctx.shadowBlur = 0
  }

  if (id === 'weight') {
    const floorDark = ctx.createRadialGradient(w * 0.5, h * 0.96, 0, w * 0.5, h * 0.96, w * 0.72)
    floorDark.addColorStop(0, `rgba(${darkRgb},0.38)`)
    floorDark.addColorStop(1, `rgba(${darkRgb},0)`)
    ctx.globalAlpha = alpha
    ctx.fillStyle = floorDark
    ctx.fillRect(0, 0, w, h)
    const floorLight = ctx.createRadialGradient(w * 0.5, h * 0.94, 0, w * 0.5, h * 0.94, w * 0.7)
    floorLight.addColorStop(0, `rgba(${lightRgb},0.55)`)
    floorLight.addColorStop(1, `rgba(${lightRgb},0)`)
    ctx.fillStyle = floorLight
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 12; i++) {
      const seed = i * 1.37
      const dropPhase = (timeSec * 0.38 + seed) % 1
      const x = (0.07 + (i * 0.078) % 0.86) * w
      const y = dropPhase * h * 1.12 - h * 0.06
      const dropW = w * 0.02
      const dropH = h * 0.06
      ctx.globalAlpha = alpha * (0.22 + 0.7 * (1 - dropPhase))
      ctx.fillStyle = darkHex
      ctx.beginPath()
      ctx.ellipse(x + dropW * 0.35, y, dropW, dropH, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = alpha * (0.35 + 0.65 * (1 - dropPhase))
      ctx.fillStyle = lightHex
      ctx.beginPath()
      ctx.ellipse(x, y, dropW, dropH, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

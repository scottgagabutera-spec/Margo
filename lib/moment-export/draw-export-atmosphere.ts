import type { AtmosphereId } from '@/lib/atmosphere'
import { isLivingAtmosphere } from '@/lib/atmosphere'

/**
 * Canvas port of the platform Atmosphere rooms (`globals.css` / AtmosphereLayer).
 * Same personalities, timings, and gold-on-dark grammar as Feed and karaoke.
 * The card fill is already the room (`--bg`); this only paints the motion.
 */

const GOLD = '#E8C547'
const GOLD_RGB = '232,197,71'
const GOLD_WARM_RGB = '245,212,106'

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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Piecewise keyframes: entries are [t01, value]. */
function keyframe(entries: Array<[number, number]>, t: number) {
  const p = ((t % 1) + 1) % 1
  for (let i = 1; i < entries.length; i++) {
    const [t1, v1] = entries[i]
    const [t0, v0] = entries[i - 1]
    if (p <= t1) {
      const span = t1 - t0
      return span <= 0 ? v1 : lerp(v0, v1, (p - t0) / span)
    }
  }
  return entries[entries.length - 1][1]
}

export function drawExportAtmosphere(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  id: AtmosphereId,
  timeSec = 0,
  borderRadius = 16,
  alpha = 1,
): void {
  if (!isLivingAtmosphere(id)) return

  ctx.save()
  roundedClip(ctx, w, h, borderRadius)
  ctx.globalAlpha = alpha

  if (id === 'breath') {
    const phase = (timeSec % 7.4) / 7.4
    const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
    ctx.fillStyle = GOLD
    ctx.globalAlpha = alpha * lerp(0.035, 0.155, wave)
    ctx.fillRect(0, 0, w, h)
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(lerp(1, 1.09, wave), lerp(1, 1.045, wave))
    ctx.translate(-w / 2, -h / 2)
    ctx.globalAlpha = alpha * lerp(0.28, 0.7, wave)
    ctx.fillStyle = `rgba(${GOLD_RGB},0.07)`
    for (let y = -h * 0.12; y < h * 1.12; y += 18) {
      ctx.fillRect(-w * 0.06, y + 17, w * 1.12, 1)
    }
    ctx.restore()
  }

  if (id === 'drift') {
    const phase = (timeSec % 6.2) / 6.2
    const x = lerp(-w * 0.55, w * 1.15, Math.min(1, phase / 0.42))
    const op = keyframe([[0, 0], [0.08, 0.88], [0.42, 0.72], [0.72, 0], [1, 0]], phase)
    const bw = w * 0.22
    ctx.save()
    ctx.translate(x + bw / 2, h / 2)
    ctx.transform(1, 0, Math.tan((-14 * Math.PI) / 180), 1, 0, 0)
    ctx.translate(-bw / 2, -h * 0.62)
    const grad = ctx.createLinearGradient(0, 0, bw, 0)
    grad.addColorStop(0, `rgba(${GOLD_RGB},0)`)
    grad.addColorStop(0.28, `rgba(${GOLD_RGB},0.06)`)
    grad.addColorStop(0.46, `rgba(${GOLD_RGB},0.18)`)
    grad.addColorStop(0.54, `rgba(${GOLD_WARM_RGB},0.14)`)
    grad.addColorStop(0.68, `rgba(${GOLD_RGB},0.05)`)
    grad.addColorStop(1, `rgba(${GOLD_RGB},0)`)
    ctx.globalAlpha = alpha * op
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, bw, h * 1.24)
    ctx.restore()
  }

  if (id === 'pulse') {
    const phase = (timeSec % 2.9) / 2.9
    const wash = keyframe(
      [[0, 0.03], [0.08, 0.03], [0.14, 0.16], [0.24, 0.05], [0.30, 0.12], [0.50, 0.03], [1, 0.03]],
      phase,
    )
    const edge = keyframe(
      [[0, 0.18], [0.08, 0.18], [0.14, 0.95], [0.24, 0.28], [0.30, 0.7], [0.55, 0.18], [1, 0.18]],
      phase,
    )
    ctx.fillStyle = GOLD
    ctx.globalAlpha = alpha * wash
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = alpha * edge
    ctx.strokeStyle = `rgba(${GOLD_RGB},0.18)`
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1)
    ctx.shadowColor = `rgba(${GOLD_RGB},0.22)`
    ctx.shadowBlur = Math.min(w, h) * 0.08
    ctx.strokeRect(2, 2, w - 4, h - 4)
    ctx.shadowBlur = Math.min(w, h) * 0.16
    ctx.shadowColor = `rgba(${GOLD_RGB},0.10)`
    ctx.strokeRect(4, 4, w - 8, h - 8)
    ctx.shadowBlur = 0
  }

  if (id === 'weight') {
    const floorPhase = (timeSec % 14) / 14
    const floorWave = 0.5 - 0.5 * Math.cos(floorPhase * Math.PI * 2)
    const floor = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, w * 0.72)
    floor.addColorStop(0, `rgba(${GOLD_RGB},0.28)`)
    floor.addColorStop(0.42, `rgba(${GOLD_RGB},0.12)`)
    floor.addColorStop(0.74, `rgba(${GOLD_RGB},0)`)
    ctx.globalAlpha = alpha * lerp(0.85, 1, floorWave)
    ctx.fillStyle = floor
    ctx.fillRect(0, h * 0.5, w, h * 0.5)

    const drops = [
      { left: 0.08, duration: 5.8, delay: 0, rw: 5.5, rh: 7.5 },
      { left: 0.18, duration: 7.2, delay: 1.1, rw: 4, rh: 5.5 },
      { left: 0.27, duration: 6.4, delay: 2.4, rw: 5.5, rh: 7.5 },
      { left: 0.36, duration: 8.1, delay: 0.6, rw: 4.5, rh: 6.5 },
      { left: 0.46, duration: 5.5, delay: 3.2, rw: 5.5, rh: 7.5 },
      { left: 0.55, duration: 6.9, delay: 1.8, rw: 4, rh: 5.5 },
      { left: 0.64, duration: 7.6, delay: 4.1, rw: 5.5, rh: 7.5 },
      { left: 0.73, duration: 5.2, delay: 2.8, rw: 5, rh: 7 },
      { left: 0.82, duration: 8.4, delay: 0.3, rw: 5.5, rh: 7.5 },
      { left: 0.90, duration: 6.1, delay: 3.7, rw: 4, rh: 5.5 },
      { left: 0.13, duration: 9, delay: 5.2, rw: 3.5, rh: 5 },
      { left: 0.69, duration: 7.8, delay: 4.8, rw: 3.5, rh: 5 },
    ]
    const fallH = h * 0.5
    for (const d of drops) {
      const p = ((timeSec - d.delay) / d.duration) % 1
      if (p < 0) continue
      const y = h * 0.5 + keyframe(
        [[0, 0], [0.82, fallH], [0.92, fallH * 1.08], [1, fallH * 1.12]],
        p,
      )
      const op = keyframe([[0, 0], [0.08, 0.9], [0.82, 0.85], [0.92, 0.4], [1, 0]], p)
      const squash = keyframe([[0, 1], [0.82, 1], [0.92, 0.55], [1, 0.35]], p)
      ctx.globalAlpha = alpha * op
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.ellipse(d.left * w, y, d.rw, d.rh * squash, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

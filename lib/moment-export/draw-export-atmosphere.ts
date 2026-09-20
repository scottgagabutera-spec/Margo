import type { AtmosphereId } from '@/lib/atmosphere'
import { ATMOSPHERE_TIMING, isLivingAtmosphere } from '@/lib/atmosphere'

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

function drawDriftBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  phase: number,
  bandW: number,
  topRatio: number,
  heightRatio: number,
  baseAlpha: number,
  alphaMul: number,
) {
  const x = lerp(-w * 0.55, w * 1.15, phase)
  const op = keyframe([[0, 0], [0.06, 0.88], [0.94, 0.72], [1, 0]], phase)
  const bw = w * bandW
  const bh = h * heightRatio
  ctx.save()
  ctx.globalAlpha = baseAlpha * op * alphaMul
  ctx.translate(x + bw / 2, h * topRatio + bh / 2)
  ctx.transform(1, 0, Math.tan((-14 * Math.PI) / 180), 1, 0, 0)
  ctx.translate(-bw / 2, -bh / 2)
  const grad = ctx.createLinearGradient(0, 0, bw, 0)
  grad.addColorStop(0, `rgba(${GOLD_RGB},0)`)
  grad.addColorStop(0.28, `rgba(${GOLD_RGB},0.06)`)
  grad.addColorStop(0.46, `rgba(${GOLD_RGB},0.18)`)
  grad.addColorStop(0.54, `rgba(${GOLD_WARM_RGB},0.14)`)
  grad.addColorStop(0.68, `rgba(${GOLD_RGB},0.05)`)
  grad.addColorStop(1, `rgba(${GOLD_RGB},0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, bw, bh)
  ctx.restore()
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
    const phase = (timeSec % ATMOSPHERE_TIMING.breath) / ATMOSPHERE_TIMING.breath
    const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
    const deepPhase = (timeSec % 11.4) / 11.4
    const deepWave = 0.5 - 0.5 * Math.cos(deepPhase * Math.PI * 2)

    ctx.fillStyle = GOLD
    ctx.globalAlpha = alpha * lerp(0.032, 0.168, wave)
    ctx.fillRect(0, 0, w, h)

    const deepGrad = ctx.createRadialGradient(w * 0.5, h * 0.48, 0, w * 0.5, h * 0.48, w * 0.62)
    deepGrad.addColorStop(0, `rgba(${GOLD_RGB},${lerp(0.06, 0.14, deepWave)})`)
    deepGrad.addColorStop(1, `rgba(${GOLD_RGB},0)`)
    ctx.globalAlpha = alpha * lerp(0.14, 0.42, deepWave)
    ctx.fillStyle = deepGrad
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(lerp(1, 1.1, wave), lerp(1, 1.05, wave))
    ctx.translate(-w / 2, -h / 2)
    ctx.globalAlpha = alpha * lerp(0.28, 0.72, wave)
    ctx.fillStyle = `rgba(${GOLD_RGB},0.07)`
    for (let y = -h * 0.12; y < h * 1.12; y += 18) {
      ctx.fillRect(-w * 0.06, y + 17, w * 1.12, 1)
    }
    ctx.restore()
  }

  if (id === 'drift') {
    const bands = [
      { duration: ATMOSPHERE_TIMING.drift, delay: 0, bandW: 0.22, top: 0.12, height: 1.24, alpha: 1 },
      { duration: 7.2, delay: -2.8, bandW: 0.18, top: 0.18, height: 0.88, alpha: 0.72 },
      { duration: 6.8, delay: -4.6, bandW: 0.14, top: 0.42, height: 0.72, alpha: 0.55 },
    ]
    for (const band of bands) {
      const phase = ((timeSec - band.delay) % band.duration) / band.duration
      if (phase < 0) continue
      drawDriftBand(ctx, w, h, phase, band.bandW, band.top, band.height, alpha, band.alpha)
    }
  }

  if (id === 'pulse') {
    const phase = (timeSec % ATMOSPHERE_TIMING.pulse) / ATMOSPHERE_TIMING.pulse
    const wash = keyframe(
      [
        [0, 0.022], [0.08, 0.18], [0.16, 0.028], [0.28, 0.14], [0.36, 0.024],
        [0.48, 0.12], [0.56, 0.026], [0.68, 0.1], [0.76, 0.024], [1, 0.022],
      ],
      phase,
    )
    const edge = keyframe(
      [
        [0, 0.16], [0.08, 0.98], [0.16, 0.22], [0.28, 0.82], [0.36, 0.2],
        [0.48, 0.72], [0.56, 0.18], [0.68, 0.62], [0.76, 0.16], [1, 0.16],
      ],
      phase,
    )
    const bloom = keyframe(
      [
        [0, 0.18], [0.08, 0.72], [0.16, 0.2], [0.28, 0.58], [0.36, 0.18],
        [0.48, 0.5], [0.56, 0.16], [0.68, 0.44], [0.76, 0.16], [1, 0.18],
      ],
      phase,
    )
    const scale = keyframe(
      [
        [0, 1], [0.08, 1.032], [0.16, 0.994], [0.28, 1.02], [0.36, 0.998],
        [0.48, 1.014], [0.56, 1], [0.68, 1.01], [0.76, 0.996], [1, 1],
      ],
      phase,
    )

    const bloomGrad = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, w * 0.64)
    bloomGrad.addColorStop(0, `rgba(${GOLD_RGB},0.2)`)
    bloomGrad.addColorStop(1, `rgba(${GOLD_RGB},0)`)
    ctx.save()
    ctx.translate(w / 2, h * 0.44)
    ctx.scale(scale, scale)
    ctx.translate(-w / 2, -h * 0.44)
    ctx.globalAlpha = alpha * bloom
    ctx.fillStyle = bloomGrad
    ctx.fillRect(0, 0, w, h)
    ctx.restore()

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
    const floorPhase = (timeSec % ATMOSPHERE_TIMING.weightFloor) / ATMOSPHERE_TIMING.weightFloor
    const floorWave = 0.5 - 0.5 * Math.cos(floorPhase * Math.PI * 2)
    const floor = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, w * 0.72)
    floor.addColorStop(0, `rgba(${GOLD_RGB},0.28)`)
    floor.addColorStop(0.42, `rgba(${GOLD_RGB},0.12)`)
    floor.addColorStop(0.74, `rgba(${GOLD_RGB},0)`)
    ctx.globalAlpha = alpha * lerp(0.82, 1, floorWave)
    ctx.fillStyle = floor
    ctx.fillRect(0, h * 0.5, w, h * 0.5)

    const drops = [
      { left: 0.08, duration: 3.4, delay: 0, rw: 5.5, rh: 7.5 },
      { left: 0.18, duration: 4.1, delay: 0.7, rw: 4, rh: 5.5 },
      { left: 0.27, duration: 3.8, delay: 1.5, rw: 5.5, rh: 7.5 },
      { left: 0.36, duration: 4.6, delay: 0.4, rw: 4.5, rh: 6.5 },
      { left: 0.46, duration: 3.2, delay: 2.1, rw: 5.5, rh: 7.5 },
      { left: 0.55, duration: 4.2, delay: 1.1, rw: 4, rh: 5.5 },
      { left: 0.64, duration: 4.8, delay: 2.8, rw: 5.5, rh: 7.5 },
      { left: 0.73, duration: 3.1, delay: 1.9, rw: 5, rh: 7 },
      { left: 0.82, duration: 4.9, delay: 0.2, rw: 5.5, rh: 7.5 },
      { left: 0.90, duration: 3.6, delay: 2.5, rw: 4, rh: 5.5 },
      { left: 0.13, duration: 5.2, delay: 3.4, rw: 3.5, rh: 5 },
      { left: 0.69, duration: 4.4, delay: 3.1, rw: 3.5, rh: 5 },
    ]
    const fallH = h * 0.5
    for (const d of drops) {
      const p = ((timeSec - d.delay) / d.duration) % 1
      if (p < 0) continue
      const wobble = Math.sin((timeSec + d.delay) * 4.2 + d.left * 20) * 2
      const y = h * 0.5 + keyframe(
        [
          [0, 0], [0.06, fallH * 0.04], [0.22, fallH * 0.18], [0.48, fallH * 0.52],
          [0.72, fallH * 0.82], [0.88, fallH * 1.04], [1, fallH * 1.18],
        ],
        p,
      )
      const op = keyframe([[0, 0], [0.06, 0.88], [0.72, 0.55], [0.88, 0.32], [1, 0]], p)
      const stretchY = keyframe(
        [[0, 0.35], [0.06, 0.88], [0.22, 1.08], [0.48, 1.14], [0.72, 1.06], [0.88, 0.62], [1, 0.38]],
        p,
      )
      const stretchX = keyframe(
        [[0, 0.55], [0.06, 0.72], [0.48, 0.84], [0.88, 1.12], [1, 1.28]],
        p,
      )
      ctx.globalAlpha = alpha * op
      ctx.fillStyle = GOLD
      ctx.beginPath()
      ctx.ellipse(d.left * w + wobble, y, d.rw * stretchX, d.rh * stretchY, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

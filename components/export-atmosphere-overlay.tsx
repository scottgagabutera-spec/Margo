'use client'

import { useEffect, useRef } from 'react'
import { isLivingAtmosphere, type AtmosphereId } from '@/lib/atmosphere'
import { drawExportAtmosphere } from '@/lib/moment-export/draw-export-atmosphere'

interface ExportAtmosphereOverlayProps {
  personality: AtmosphereId
  onLight: boolean
  borderRadius: number
}

/**
 * Live effect layer for Moment preview — paints with the same
 * `drawExportAtmosphere` used for PNG / GIF / MP4, so what you see
 * is what the exported file gets.
 */
export function ExportAtmosphereOverlay({
  personality,
  onLight,
  borderRadius,
}: ExportAtmosphereOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isLivingAtmosphere(personality)) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const start = performance.now()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const fit = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (w <= 0 || h <= 0) return { w: 0, h: 0, dpr: 1 }
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const pw = Math.round(w * dpr)
      const ph = Math.round(h * dpr)
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw
        canvas.height = ph
      }
      return { w, h, dpr }
    }

    const paint = (now: number) => {
      if (!running) return
      const { w, h, dpr } = fit()
      if (w > 0 && h > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        const t = reduced ? 0 : (now - start) / 1000
        drawExportAtmosphere(ctx, w, h, personality, t, borderRadius, 1, onLight)
      }
      if (!reduced) raf = requestAnimationFrame(paint)
    }

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (reduced) paint(start)
        })
      : null
    ro?.observe(wrap)

    paint(performance.now())
    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [personality, onLight, borderRadius])

  if (!isLivingAtmosphere(personality)) return null

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        borderRadius: 'inherit',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}

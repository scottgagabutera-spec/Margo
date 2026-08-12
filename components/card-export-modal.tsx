'use client'
import { CloseIcon } from '@/components/icons'
import { recordCardExport } from '@/lib/engagement/card-exports'

import { useState, useRef, useEffect, useCallback } from 'react'

interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric?: string
  song?: string
  artist?: string
  postId?: string
  // Lyric Back dual-card: if these are present, canvas draws parent + reply
  parentLyric?: string
  parentSong?: string
  parentArtist?: string
}

/* ─── Themes ────────────────────────────────────────────────── */
const THEMES = [
  { id: 'violet',  label: 'Violet',  color: '#E8C547', bg: '#0E0B1A' },
  { id: 'purple',  label: 'Purple',  color: '#c77dff', bg: '#0d0014' },
  { id: 'ocean',   label: 'Ocean',   color: '#00e5ff', bg: '#050e1a' },
  { id: 'ember',   label: 'Ember',   color: '#ff6b6b', bg: '#1a0505' },
  { id: 'forest',  label: 'Forest',  color: '#50fa7b', bg: '#051a0d' },
  { id: 'bone',    label: 'Bone',    color: '#B8901A', bg: '#f5f1e8' },
]

/* ─── Shapes ────────────────────────────────────────────────── */
const SHAPES = [
  { id: 'square',   label: 'Square',  ratio: '1:1',   w: 1080, h: 1080 },
  { id: 'vertical', label: 'Story',   ratio: '4:5',   w: 1080, h: 1350 },
  { id: 'wide',     label: 'Wide',    ratio: '16:9',  w: 1920, h: 1080 },
]

/* ─── Font loader ────────────────────────────────────────────── */
async function waitForFonts() {
  if (typeof document === 'undefined') return
  try { await (document as any).fonts.ready } catch {}
}

/* ─── Draw Margo lockup on canvas ───────────────────────────── */
function drawMargoLockup(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  color: string
) {
  const r = size / 2
  const cx = x + r, cy = y + r
  const sc = size / 80

  ctx.save()
  // Circle
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  // M stroke
  ctx.strokeStyle = '#0B0B0D'
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
  // Dash
  ctx.fillStyle = '#0B0B0D'
  ctx.globalAlpha = 0.55
  const dw = 10 * sc, dh = 3.5 * sc
  ctx.beginPath()
  ctx.roundRect(cx - dw / 2, cy + (60 - 40) * sc - dh / 2, dw, dh, 1.75 * sc)
  ctx.fill()
  ctx.restore()

  // Wordmark
  ctx.save()
  ctx.fillStyle = color
  ctx.font = `800 ${Math.round(size * 0.35)}px Syne, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('MARGO', x + size + Math.round(size * 0.18), cy)
  ctx.restore()
}

/* ─── Wrap text ─────────────────────────────────────────────── */
function wrapText(ctx: CanvasRenderingContext2D, txt: string, maxW: number): string[] {
  const words = txt.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = word
    } else { line = test }
  }
  if (line) lines.push(line)
  return lines
}

/* ─── Draw single-lyric card ────────────────────────────────── */
async function drawSingleCard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  lyric: string, song: string, artist: string,
  themeColor: string, themeBg: string,
  opacity: number = 1
) {
  await waitForFonts()

  // Background
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.38, W * 0.85)
  grad.addColorStop(0, themeBg === '#f5f1e8' ? '#f5f1e8' : '#16131F')
  grad.addColorStop(1, themeBg)
  ctx.globalAlpha = opacity
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.32)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 1

  // Gold border
  ctx.strokeStyle = `${themeColor}38`
  ctx.lineWidth = 2
  ctx.strokeRect(44, 44, W - 88, H - 88)

  // Logo — ghost watermark
  const logoBase = Math.min(W, H)
  const markSize = Math.round(logoBase * 0.032)
  const logoPad  = Math.round(logoBase * 0.052)
  ctx.globalAlpha = 0.32
  drawMargoLockup(ctx, logoPad, logoPad, markSize, themeColor)
  ctx.globalAlpha = 1

  // Lyric text
  const lyricFS = Math.round(Math.min(W, H) * 0.044)
  ctx.font = `italic ${lyricFS}px Lora, serif`
  ctx.fillStyle = themeBg === '#f5f1e8' ? '#1a1a1a' : '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const maxW = W - Math.round(W * 0.22)
  const lines = wrapText(ctx, lyric, maxW)
  const lineH = lyricFS * 1.45
  const totalH = lines.length * lineH
  let y = (H - totalH) / 2 + lyricFS * 0.5 + Math.round(H * 0.02)
  for (const l of lines) { ctx.fillText(l, W / 2, y); y += lineH }

  // Song name
  const songFS = Math.round(Math.min(W, H) * 0.028)
  ctx.font = `700 ${songFS}px Bebas Neue, sans-serif`
  ctx.fillStyle = themeBg === '#f5f1e8' ? '#1a1a1a' : 'rgba(255,255,255,0.9)'
  ctx.letterSpacing = '3px'
  ctx.fillText((song || '').toUpperCase(), W / 2, H - Math.round(H * 0.168))
  ctx.letterSpacing = '0px'

  // Artist name
  const artistFS = Math.round(Math.min(W, H) * 0.022)
  ctx.font = `400 ${artistFS}px Lora, serif`
  ctx.fillStyle = themeBg === '#f5f1e8' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'
  ctx.fillText(artist || '', W / 2, H - Math.round(H * 0.168) + songFS + 12)

  // Divider
  ctx.strokeStyle = `${themeColor}33`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2 - 110, H - Math.round(H * 0.1))
  ctx.lineTo(W / 2 + 110, H - Math.round(H * 0.1))
  ctx.stroke()

  // Watermark
  const wmFS = Math.round(Math.min(W, H) * 0.02)
  ctx.font = `400 ${wmFS}px Lora, serif`
  ctx.fillStyle = `${themeColor}99`
  ctx.fillText('trymargo.com', W / 2, H - Math.round(H * 0.068))
}

/* ─── Draw dual-card — chat bubble layout ───────────────────── */
async function drawDualCard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  parentLyric: string, parentSong: string, parentArtist: string,
  replyLyric: string, replySong: string, replyArtist: string,
  themeColor: string, themeBg: string
) {
  await waitForFonts()

  const isLight = themeBg === '#f5f1e8'

  // Background
  const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.9)
  bgGrad.addColorStop(0, isLight ? '#f5f1e8' : '#16131F')
  bgGrad.addColorStop(1, themeBg)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)

  // Ghost logo — top left
  const logoBase = Math.min(W, H)
  const markSize = Math.round(logoBase * 0.028)
  const logoPad  = Math.round(logoBase * 0.052)
  ctx.globalAlpha = 0.28
  drawMargoLockup(ctx, logoPad, logoPad, markSize, themeColor)
  ctx.globalAlpha = 1

  // Layout
  const topPad    = logoPad + markSize + Math.round(logoBase * 0.05)
  const bottomPad = Math.round(H * 0.09)
  const footerY   = H - bottomPad
  const hPad      = Math.round(W * 0.07)  // horizontal padding from edges
  const bubbleW   = Math.round(W * 0.74)  // bubble max width
  const lFS       = Math.round(logoBase * (H > W ? 0.048 : 0.038))
  const metaFS    = Math.round(logoBase * 0.019)
  const lineH     = lFS * 1.42
  const bubblePadH = Math.round(lFS * 0.7)
  const bubblePadV = Math.round(lFS * 0.6)
  const radius     = Math.round(lFS * 0.55)
  const tailSize   = Math.round(lFS * 0.35)

  // ── Helper: measure bubble height ──
  function bubbleContentH(lyric: string, song: string, artist: string): number {
    ctx.font = `italic ${lFS}px Lora, serif`
    const lines = wrapText(ctx, lyric, bubbleW - bubblePadH * 2)
    const lyricH = lines.length * lineH
    return bubblePadV * 2 + lyricH + metaFS * 2.2 + 16
  }

  // ── Helper: draw rounded rect ──
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  // ── Helper: draw bubble ──
  function drawBubble(
    lyric: string, song: string, artist: string,
    y: number, isLeft: boolean,
    bgCol: string, lyricCol: string, metaCol: string, metaSubCol: string
  ): number {
    const x = isLeft ? hPad : W - hPad - bubbleW
    ctx.font = `italic ${lFS}px Lora, serif`
    const lines = wrapText(ctx, lyric, bubbleW - bubblePadH * 2)
    const lyricBlockH = lines.length * lineH
    const bH = bubblePadV * 2 + lyricBlockH + metaFS * 2.2 + 16

    // Shadow
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.shadowBlur  = 24
    ctx.shadowOffsetY = 6

    // Bubble background
    ctx.fillStyle = bgCol
    roundRect(x, y, bubbleW, bH, radius)
    ctx.fill()
    ctx.restore()

    // Tail — small triangle at bottom of bubble
    const tailX = isLeft ? x + Math.round(bubbleW * 0.12) : x + bubbleW - Math.round(bubbleW * 0.12)
    ctx.fillStyle = bgCol
    ctx.beginPath()
    if (isLeft) {
      ctx.moveTo(tailX - tailSize, y + bH)
      ctx.lineTo(tailX + tailSize, y + bH)
      ctx.lineTo(tailX, y + bH + tailSize)
    } else {
      ctx.moveTo(tailX - tailSize, y + bH)
      ctx.lineTo(tailX + tailSize, y + bH)
      ctx.lineTo(tailX, y + bH + tailSize)
    }
    ctx.closePath()
    ctx.fill()

    // Lyric text
    ctx.fillStyle = lyricCol
    ctx.font = `italic ${lFS}px Lora, serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    let ty = y + bubblePadV + lineH * 0.5
    for (const l of lines) {
      ctx.fillText(l, x + bubblePadH, ty)
      ty += lineH
    }

    // Divider rule inside bubble
    const ruleY = y + bubblePadV + lyricBlockH + 10
    ctx.strokeStyle = isLeft ? 'rgba(0,0,0,0.15)' : `${themeColor}40`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + bubblePadH, ruleY)
    ctx.lineTo(x + bubbleW - bubblePadH, ruleY)
    ctx.stroke()

    // Song name
    ctx.fillStyle = metaCol
    ctx.font = `700 ${metaFS}px Lora, serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText((song || '').toUpperCase(), x + bubblePadH, ruleY + 14 + metaFS * 0.5)

    // Artist name
    ctx.fillStyle = metaSubCol
    ctx.font = `400 ${Math.round(metaFS * 0.85)}px Lora, serif`
    ctx.fillText(artist || '', x + bubblePadH, ruleY + 14 + metaFS * 1.6)

    return bH
  }

  // ── Measure total content height to centre vertically ──
  const gap = Math.round(H * 0.06)
  const b1H = bubbleContentH(parentLyric, parentSong, parentArtist)
  const b2H = bubbleContentH(replyLyric, replySong, replyArtist)
  const totalContent = b1H + tailSize + gap + b2H + tailSize
  const startY = topPad + Math.max(0, (footerY - 24 - topPad - totalContent) / 2)

  // Bubble 1 — parent lyric, LEFT aligned, gold bubble dark text
  const goldBubbleBg   = themeColor
  const goldLyricCol   = isLight ? '#1a1a1a' : '#07060A'
  const goldMetaCol    = isLight ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.75)'
  const goldMetaSubCol = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.5)'
  drawBubble(parentLyric, parentSong, parentArtist, startY, true,
    goldBubbleBg, goldLyricCol, goldMetaCol, goldMetaSubCol)

  // Bubble 2 — reply lyric, RIGHT aligned, dark bubble light text
  const darkBubbleBg   = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
  const darkLyricCol   = isLight ? '#1a1a1a' : '#F4F1ED'
  const darkMetaCol    = isLight ? '#1a1a1a' : '#F4F1ED'
  const darkMetaSubCol = isLight ? 'rgba(0,0,0,0.5)' : '#9A98A4'
  const b2Y = startY + b1H + tailSize + gap
  drawBubble(replyLyric, replySong, replyArtist, b2Y, false,
    darkBubbleBg, darkLyricCol, darkMetaCol, darkMetaSubCol)

  // Footer
  ctx.strokeStyle = `${themeColor}18`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(hPad, footerY - 20)
  ctx.lineTo(W - hPad, footerY - 20)
  ctx.stroke()

  const wmFS = Math.round(logoBase * 0.019)
  ctx.font = `400 ${wmFS}px Lora, serif`
  ctx.fillStyle = `${themeColor}99`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('trymargo.com', W / 2, footerY)
}

export function CardExportModal({
  open, onOpenChange,
  lyric = '', song = '', artist = '',
  postId,
  parentLyric, parentSong, parentArtist,
}: CardExportModalProps) {
  const [theme, setTheme] = useState('violet')
  const [shape, setShape] = useState('square')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDualCard = !!(parentLyric && parentSong && parentArtist)
  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0]
  const activeShape = SHAPES.find(s => s.id === shape) || SHAPES[0]

  const url = postId ? `https://trymargo.com/lyric-back?postId=${postId}` : 'https://trymargo.com'
  const copyText = isDualCard
    ? `"${parentLyric}" ↩ "${lyric}" — trymargo.com`
    : lyric ? `"${lyric}" — ${artist}, ${song}` : ''

  /* ─── Render canvas ─────────────────────────────────────── */
  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = activeShape
    const SCALE = 2
    canvas.width = w * SCALE
    canvas.height = h * SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(SCALE, SCALE)

    if (isDualCard) {
      await drawDualCard(
        ctx, w, h,
        parentLyric!, parentSong!, parentArtist!,
        lyric, song, artist,
        activeTheme.color, activeTheme.bg
      )
    } else {
      await drawSingleCard(ctx, w, h, lyric, song, artist, activeTheme.color, activeTheme.bg)
    }
  }, [theme, shape, lyric, song, artist, parentLyric, parentSong, parentArtist, isDualCard, activeTheme, activeShape])

  useEffect(() => {
    if (open) renderCanvas()
  }, [open, renderCanvas])

  /* ─── Save ──────────────────────────────────────────────── */
  const handleSave = useCallback(async () => {
    await renderCanvas()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      if (!blob) return
      const slugReply = (song || 'Lyric').trim().replace(/[^a-z0-9\s]/gi, '').split(/\s+/).slice(0, 3).join('-').toLowerCase()
      const slugParent = isDualCard ? (parentSong || '').trim().replace(/[^a-z0-9\s]/gi, '').split(/\s+/).slice(0, 3).join('-').toLowerCase() : ''
      const slug = isDualCard ? `${slugParent}_LyricBack_${slugReply}` : slugReply
      const filename = `MARGO_${slug}_${activeShape.label}.png`
      const url2 = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url2; a.download = filename
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url2), 5000)
      // Analytics: never await — download must not wait on network
      void recordCardExport({ postId, theme, shape })
    }, 'image/png')
  }, [renderCanvas, song, isDualCard, activeShape, postId, theme, shape])

  /* ─── Copy ──────────────────────────────────────────────── */
  const handleCopy = useCallback(() => {
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [copyText])

  /* ─── Share ─────────────────────────────────────────────── */
  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: 'MARGO', text: copyText.substring(0, 60), url }); return }
      catch (e: any) { if (e.name === 'AbortError') return }
    }
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(url)
  }, [copyText, url])

  if (!open) return null

  /* ─── Preview aspect ratio ──────────────────────────────── */
  const previewAspect = activeShape.h / activeShape.w

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(7,6,10,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
      onClick={() => onOpenChange(false)}
    >
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--surface, #0F0E13)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          /* 32px content pad + live tab bar / mini-player / safe-area clearance */
          padding: '0 0 calc(32px + var(--margo-page-bottom))',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92dvh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>
            {isDualCard ? 'Lyric Back Card' : 'Share Card'}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          ><CloseIcon size={14} color="var(--text-secondary)" /></button>
        </div>

        {/* Canvas preview — scrollable so full card is reachable */}
        <div style={{ margin: '14px 20px 0', borderRadius: '12px', overflow: 'hidden', background: '#07060A', position: 'relative', maxHeight: '260px', overflowY: 'auto' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', aspectRatio: `${activeShape.w} / ${activeShape.h}`, display: 'block' }}
          />
        </div>

        {/* Theme row */}
        <div style={{ padding: '16px 20px 0' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Theme</p>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', borderRadius: '50px', flexShrink: 0,
                  background: theme === t.id ? 'rgba(232,197,71,0.12)' : 'transparent',
                  border: theme === t.id ? '1px solid rgba(232,197,71,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.72rem', color: theme === t.id ? '#E8C547' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Shape row */}
        <div style={{ padding: '14px 20px 0' }}>
          <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Shape</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {SHAPES.map(s => (
              <button
                key={s.id}
                onClick={() => setShape(s.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '10px 8px', borderRadius: '12px', cursor: 'pointer',
                  background: shape === s.id ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.03)',
                  border: shape === s.id ? '1px solid rgba(232,197,71,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 150ms ease',
                }}
              >
                <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.75rem', color: shape === s.id ? '#E8C547' : 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'var(--text-muted)' }}>{s.ratio}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px' }}>
          <button
            onClick={handleSave}
            style={{ flex: 2, padding: '13px', background: '#E8C547', color: '#07060A', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
          >Save Card</button>
          <button
            onClick={handleCopy}
            style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.05)', color: copied ? '#E8C547' : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 600, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', transition: 'color 150ms ease' }}
          >{copied ? 'Copied' : 'Copy'}</button>
          <button
            onClick={handleShare}
            style={{ flex: 1, padding: '13px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '50px', fontFamily: 'var(--font-lora), serif', fontWeight: 600, fontSize: '0.6rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}
          >Share</button>
        </div>

      </div>
    </div>
  )
}

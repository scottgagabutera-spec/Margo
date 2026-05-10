'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric?: string
  song?: string
  artist?: string
  postId?: string
}

// ── Theme definitions (canvas colours + preview) ──
const THEMES = [
  { id: 'midnight-gold',   label: 'Violet',   bg: '#0E0B1A', accent: '#E8C547', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'royal-purple',    label: 'Purple',   bg: '#0d0014', accent: '#c77dff', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'neon-cyan',       label: 'Ocean',    bg: '#050e1a', accent: '#00e5ff', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'sunset-coral',    label: 'Ember',    bg: '#1a0505', accent: '#ff6b6b', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'emerald-night',   label: 'Forest',   bg: '#051a0d', accent: '#50fa7b', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'cream-editorial', label: 'Bone',     bg: '#f5f1e8', accent: '#B8901A', text: '#1a1612', sub: '#6b5e4a' },
]

// ── Shape dimensions ──
const SHAPES: Record<string, { w: number; h: number; label: string; ratio: string }> = {
  square:   { w: 1080, h: 1080, label: 'Square',   ratio: '1:1'  },
  vertical: { w: 1080, h: 1350, label: 'Vertical', ratio: '4:5'  },
  wide:     { w: 1920, h: 1080, label: 'Wide',      ratio: '16:9' },
}

// ── Draw Margo logo lockup on canvas ──
function drawMargoLockup(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  markSize: number,
  accentColor: string,
  bgColor: string,
) {
  const sc = markSize / 80
  const r  = markSize / 2
  const cx = x + r
  const cy = y + r

  // Circle
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = accentColor
  ctx.fill()

  // M mark inside circle
  ctx.strokeStyle = bgColor
  ctx.lineWidth   = 5 * sc
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
  ctx.beginPath()
  ctx.moveTo(cx + (17-40)*sc, cy + (57-40)*sc)
  ctx.lineTo(cx + (17-40)*sc, cy + (27-40)*sc)
  ctx.lineTo(cx + (29-40)*sc, cy + (45-40)*sc)
  ctx.lineTo(cx + (40-40)*sc, cy + (26-40)*sc)
  ctx.lineTo(cx + (51-40)*sc, cy + (45-40)*sc)
  ctx.lineTo(cx + (63-40)*sc, cy + (27-40)*sc)
  ctx.lineTo(cx + (63-40)*sc, cy + (57-40)*sc)
  ctx.stroke()

  // Dash below M
  ctx.fillStyle  = bgColor
  ctx.globalAlpha = 0.55
  const dW = 10*sc, dH = 3.5*sc
  ctx.beginPath()
  ctx.roundRect(cx - dW/2, cy + (60-40)*sc - dH/2, dW, dH, 1.75*sc)
  ctx.fill()
  ctx.restore()

  // Wordmark
  ctx.save()
  ctx.fillStyle    = accentColor
  ctx.font         = `800 ${Math.round(markSize * 0.7)}px Syne, sans-serif`
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('MARGO', x + markSize + Math.round(markSize * 0.35), y + r)
  ctx.restore()
}

// ── Wrap text into lines ──
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

// ── Main canvas draw ──
async function drawCard(
  canvas: HTMLCanvasElement,
  lyric: string,
  song: string,
  artist: string,
  themeId: string,
  shapeId: string,
  scale = 1,
) {
  const shape  = SHAPES[shapeId]
  const theme  = THEMES.find(t => t.id === themeId) || THEMES[0]
  const W = shape.w * scale
  const H = shape.h * scale

  canvas.width  = W
  canvas.height = H

  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  const Ws = shape.w
  const Hs = shape.h
  const isV = Hs > Ws
  const isL = Ws > Hs

  // ── Background gradient ──
  const bgGrad = ctx.createRadialGradient(Ws*0.5, Hs*0.38, 0, Ws*0.5, Hs*0.38, Ws*0.85)
  bgGrad.addColorStop(0, theme.bg === '#f5f1e8' ? '#f5f1e8' : adjustBrightness(theme.bg, 1.6))
  bgGrad.addColorStop(1, theme.bg)
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, Ws, Hs)

  // Vignette
  const vig = ctx.createRadialGradient(Ws/2, Hs/2, Hs*0.3, Ws/2, Hs/2, Hs*0.85)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.32)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, Ws, Hs)

  // ── Border ──
  ctx.strokeStyle = hexToRgba(theme.accent, 0.22)
  ctx.lineWidth   = 1.5
  const bPad = Math.round(Math.min(Ws, Hs) * 0.044)
  ctx.strokeRect(bPad, bPad, Ws - bPad*2, Hs - bPad*2)

  // ── Logo lockup ──
  const markSize = Math.round(Math.min(Ws, Hs) * 0.038)
  const logoX    = Math.round(Math.min(Ws, Hs) * 0.055)
  const logoY    = Math.round(Math.min(Ws, Hs) * 0.055)
  drawMargoLockup(ctx, logoX, logoY, markSize, theme.accent, theme.bg)

  // ── Lyric text ──
  const lyricFS = isV ? 56 : (isL ? 52 : 48)
  const maxW    = Ws - (isL ? 280 : 240)
  ctx.font         = `italic ${lyricFS}px Instrument Serif, Georgia, serif`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  const lines  = wrapText(ctx, lyric || '\u201cYour lyric here\u201d', maxW)
  const lineH  = lyricFS * 1.42
  const totalH = lines.length * lineH
  const lyricStartY = (Hs - totalH) / 2 + (isV ? 30 : 20)

  // Subtle glow behind lyric
  ctx.save()
  const lyricGlow = ctx.createRadialGradient(Ws/2, lyricStartY + totalH/2, 0, Ws/2, lyricStartY + totalH/2, Ws * 0.45)
  lyricGlow.addColorStop(0, hexToRgba(theme.accent, 0.06))
  lyricGlow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = lyricGlow
  ctx.fillRect(0, 0, Ws, Hs)
  ctx.restore()

  ctx.fillStyle = theme.text
  ctx.font      = `italic ${lyricFS}px Instrument Serif, Georgia, serif`
  let y = lyricStartY
  for (const l of lines) {
    ctx.fillText(l, Ws / 2, y)
    y += lineH
  }

  // ── Divider ──
  const dividerY = lyricStartY + totalH + (isV ? 52 : 40)
  const divW     = isV ? 120 : 90
  ctx.strokeStyle = hexToRgba(theme.accent, 0.4)
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(Ws/2 - divW/2, dividerY)
  ctx.lineTo(Ws/2 + divW/2, dividerY)
  ctx.stroke()

  // ── Song name ──
  const songFS = isV ? 32 : (isL ? 30 : 28)
  ctx.fillStyle    = theme.text
  ctx.font         = `700 ${songFS}px Syne, sans-serif`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText((song || 'Song Name').toUpperCase(), Ws/2, dividerY + (isV ? 44 : 36))

  // ── Artist name ──
  const artistFS = isV ? 26 : 22
  ctx.fillStyle    = theme.sub
  ctx.font         = `400 ${artistFS}px Lora, Georgia, serif`
  ctx.textBaseline = 'middle'
  ctx.fillText(artist || 'Artist', Ws/2, dividerY + (isV ? 44 : 36) + songFS + 18)

  // ── Footer ──
  const footerY = Hs - Math.round(Math.min(Ws, Hs) * 0.055)
  ctx.strokeStyle = hexToRgba(theme.accent, 0.1)
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(bPad + 40, footerY - 22)
  ctx.lineTo(Ws - bPad - 40, footerY - 22)
  ctx.stroke()

  ctx.fillStyle    = hexToRgba(theme.accent, 0.55)
  ctx.font         = `400 ${isV ? 24 : 20}px Lora, Georgia, serif`
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('trymargo.com', Ws/2, footerY)
}

// ── Colour utilities ──
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
function adjustBrightness(hex: string, factor: number): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1,3),16) * factor))
  const g = Math.min(255, Math.round(parseInt(hex.slice(3,5),16) * factor))
  const b = Math.min(255, Math.round(parseInt(hex.slice(5,7),16) * factor))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

// ── Modal component ──
export function CardExportModal({
  open,
  onOpenChange,
  lyric   = '',
  song    = '',
  artist  = '',
  postId,
}: CardExportModalProps) {
  const [theme, setTheme]         = useState('midnight-gold')
  const [shape, setShape]         = useState('square')
  const [copying, setCopying]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [copied, setCopied]       = useState(false)
  const previewRef                = useRef<HTMLCanvasElement>(null)

  const url      = postId ? `https://trymargo.com/lyric-back?postId=${postId}` : 'https://trymargo.com'
  const copyText = lyric ? `"${lyric}" — ${artist}, ${song}` : ''
  const shareText = lyric ? `"${lyric.substring(0,60)}" — trymargo.com` : 'trymargo.com'

  // Redraw preview whenever params change
  useEffect(() => {
    if (!open || !previewRef.current) return
    const canvas = previewRef.current
    drawCard(canvas, lyric, song, artist, theme, shape, 1).catch(console.error)
  }, [open, lyric, song, artist, theme, shape])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const offscreen = document.createElement('canvas')
      await drawCard(offscreen, lyric, song, artist, theme, shape, 2) // 2× for crisp export
      offscreen.toBlob(blob => {
        if (!blob) return
        const slugSong = (song || 'Lyric').trim().replace(/[^a-z0-9\s]/gi,'').split(/\s+/).slice(0,4).join('-').toLowerCase()
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = `MARGO_${slugSong}_${SHAPES[shape].label}.png`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      }, 'image/png')
    } finally {
      setSaving(false)
    }
  }, [lyric, song, artist, theme, shape, saving])

  const handleCopy = useCallback(async () => {
    if (!copyText) return
    await navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }, [copyText])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'MARGO', text: shareText, url }); return }
      catch(e: any) { if (e.name === 'AbortError') return }
    }
    await navigator.clipboard.writeText(url)
  }, [shareText, url])

  if (!open) return null

  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0]
  const previewShape = SHAPES[shape]
  const previewAspect = previewShape.h / previewShape.w

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,6,10,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
        animation: 'ceBackdropIn 220ms ease',
      }}
    >
      <style>{`
        @keyframes ceBackdropIn { from { opacity:0 } to { opacity:1 } }
        @keyframes ceSheetUp    { from { transform:translateY(48px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        @media(min-width:600px){
          .ce-sheet { border-radius:24px!important; border-bottom:1px solid rgba(255,255,255,0.07)!important; animation:ceSheetFade 300ms cubic-bezier(0.16,1,0.3,1)!important; }
        }
        @keyframes ceSheetFade  { from { transform:translateY(16px) scale(0.98); opacity:0 } to { transform:translateY(0) scale(1); opacity:1 } }
        .ce-theme-btn:hover { border-color:rgba(255,255,255,0.3)!important; }
        .ce-shape-btn:hover { border-color:rgba(255,255,255,0.25)!important; }
        .ce-action-btn:hover { filter:brightness(1.12); }
      `}</style>

      <div
        className="ce-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px',
          background: '#0F0E13',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92dvh',
          animation: 'ceSheetUp 340ms cubic-bezier(0.16,1,0.3,1)',
          fontFamily: 'var(--font-lora), "Lora", serif',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', margin: '12px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '4px', color: '#E8C547', textTransform: 'uppercase' }}>MARGO</p>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '1.1rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>Your Card</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease', flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

          {/* Live canvas preview */}
          <div style={{
            width: '100%',
            marginBottom: '20px',
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.07)',
            background: activeTheme.bg,
            position: 'relative',
          }}>
            <canvas
              ref={previewRef}
              style={{
                width: '100%',
                aspectRatio: `${previewShape.w} / ${previewShape.h}`,
                display: 'block',
              }}
            />
          </div>

          {/* Theme picker */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Theme</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className="ce-theme-btn"
                  onClick={() => setTheme(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px',
                    background: theme === t.id ? hexToRgba(t.accent, 0.12) : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${theme === t.id ? hexToRgba(t.accent, 0.5) : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '50px',
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                >
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.accent, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: 'var(--font-lora), serif', fontSize: '0.78rem',
                    color: theme === t.id ? t.accent : 'rgba(255,255,255,0.55)',
                    fontWeight: theme === t.id ? 600 : 400,
                  }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shape picker */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>Shape</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {Object.entries(SHAPES).map(([id, s]) => (
                <button
                  key={id}
                  className="ce-shape-btn"
                  onClick={() => setShape(id)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    padding: '16px 8px',
                    background: shape === id ? 'rgba(232,197,71,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${shape === id ? 'rgba(232,197,71,0.45)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '14px',
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                >
                  {/* Shape icon */}
                  <div style={{
                    width:  id === 'wide' ? '28px' : id === 'vertical' ? '18px' : '22px',
                    height: id === 'wide' ? '16px' : id === 'vertical' ? '28px' : '22px',
                    border: `1.5px solid ${shape === id ? '#E8C547' : 'rgba(255,255,255,0.3)'}`,
                    borderRadius: '3px',
                  }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.78rem', color: shape === id ? '#E8C547' : 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{s.label}</p>
                    <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{s.ratio}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Save Card */}
            <button
              className="ce-action-btn"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '14px 10px',
                background: '#E8C547', color: '#07060A',
                borderRadius: '14px', border: 'none', cursor: saving ? 'default' : 'pointer',
                fontFamily: 'var(--font-lora), serif', fontWeight: 700, fontSize: '0.72rem',
                letterSpacing: '0.5px',
                opacity: saving ? 0.7 : 1,
                transition: 'all 150ms ease',
                boxShadow: '0 4px 20px rgba(232,197,71,0.22)',
              }}
            >
              {saving ? (
                <>
                  <span style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#07060A', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Saving…
                </>
              ) : (
                <>↓ Save Card</>
              )}
            </button>

            {/* Copy Text */}
            <button
              className="ce-action-btn"
              onClick={handleCopy}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '14px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: copied ? '#E8C547' : 'rgba(255,255,255,0.75)',
                borderRadius: '14px', cursor: 'pointer',
                fontFamily: 'var(--font-lora), serif', fontWeight: 600, fontSize: '0.72rem',
                transition: 'all 150ms ease',
              }}
            >
              {copied ? '✓ Copied' : '⎘ Copy Text'}
            </button>

            {/* Share */}
            <button
              className="ce-action-btn"
              onClick={handleShare}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '14px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.75)',
                borderRadius: '14px', cursor: 'pointer',
                fontFamily: 'var(--font-lora), serif', fontWeight: 600, fontSize: '0.72rem',
                transition: 'all 150ms ease',
              }}
            >
              ↑ Share
            </button>
          </div>
        </div>

        {/* Safe area bottom */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: '#0F0E13' }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

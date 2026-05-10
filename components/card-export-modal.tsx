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

const THEMES = [
  { id: 'midnight-gold',   label: 'Violet', bg: '#0E0B1A', accent: '#E8C547', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'royal-purple',    label: 'Purple', bg: '#0d0014', accent: '#c77dff', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'neon-cyan',       label: 'Ocean',  bg: '#050e1a', accent: '#00e5ff', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'sunset-coral',    label: 'Ember',  bg: '#1a0505', accent: '#ff6b6b', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'emerald-night',   label: 'Forest', bg: '#051a0d', accent: '#50fa7b', text: '#F4F1ED', sub: '#9A98A4' },
  { id: 'cream-editorial', label: 'Bone',   bg: '#f5f1e8', accent: '#B8901A', text: '#1a1612', sub: '#6b5e4a' },
]

const SHAPES: Record<string, { w: number; h: number; label: string; ratio: string }> = {
  square:   { w: 1080, h: 1080, label: 'Square', ratio: '1:1'  },
  vertical: { w: 1080, h: 1350, label: 'Story',  ratio: '4:5'  },
  wide:     { w: 1920, h: 1080, label: 'Wide',   ratio: '16:9' },
}

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

  ctx.save()
  ctx.globalAlpha = 0.32 // ghost — subtle watermark only

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = accentColor
  ctx.fill()

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

  const dW = 10*sc, dH = 3.5*sc
  ctx.fillStyle   = bgColor
  ctx.globalAlpha = 0.32 * 0.55
  ctx.beginPath()
  ctx.roundRect(cx - dW/2, cy + (60-40)*sc - dH/2, dW, dH, 1.75*sc)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha  = 0.32
  ctx.fillStyle    = accentColor
  ctx.font         = `800 ${Math.round(markSize * 0.65)}px Syne, sans-serif`
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('MARGO', x + markSize + Math.round(markSize * 0.32), y + r)
  ctx.restore()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  return lines
}

async function drawCard(
  canvas: HTMLCanvasElement,
  lyric: string, song: string, artist: string,
  themeId: string, shapeId: string, scale = 1,
) {
  const shape = SHAPES[shapeId]
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  canvas.width  = shape.w * scale
  canvas.height = shape.h * scale

  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  const Ws = shape.w, Hs = shape.h
  const isV = Hs > Ws, isL = Ws > Hs

  // Background
  const bg = ctx.createRadialGradient(Ws*.5, Hs*.38, 0, Ws*.5, Hs*.38, Ws*.85)
  bg.addColorStop(0, theme.bg === '#f5f1e8' ? '#f5f1e8' : adjustBrightness(theme.bg, 1.6))
  bg.addColorStop(1, theme.bg)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, Ws, Hs)

  // Vignette
  const vig = ctx.createRadialGradient(Ws/2, Hs/2, Hs*.3, Ws/2, Hs/2, Hs*.85)
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = vig; ctx.fillRect(0, 0, Ws, Hs)

  // Border
  const bPad = Math.round(Math.min(Ws, Hs) * .044)
  ctx.strokeStyle = hexToRgba(theme.accent, .18); ctx.lineWidth = 1.5
  ctx.strokeRect(bPad, bPad, Ws - bPad*2, Hs - bPad*2)

  // Ghost logo — smaller than before
  const markSize = Math.round(Math.min(Ws, Hs) * .026)
  const logoX    = Math.round(Math.min(Ws, Hs) * .058)
  const logoY    = Math.round(Math.min(Ws, Hs) * .058)
  drawMargoLockup(ctx, logoX, logoY, markSize, theme.accent, theme.bg)

  // Lyric
  const lyricFS = isV ? 56 : (isL ? 52 : 48)
  const maxW    = Ws - (isL ? 280 : 240)
  ctx.font = `italic ${lyricFS}px Instrument Serif, Georgia, serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const lines  = wrapText(ctx, lyric || '\u201cYour lyric here\u201d', maxW)
  const lineH  = lyricFS * 1.42
  const totalH = lines.length * lineH
  const lyricY = (Hs - totalH) / 2 + (isV ? 30 : 20)

  // Glow behind lyric
  ctx.save()
  const glow = ctx.createRadialGradient(Ws/2, lyricY+totalH/2, 0, Ws/2, lyricY+totalH/2, Ws*.45)
  glow.addColorStop(0, hexToRgba(theme.accent, .06)); glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, Ws, Hs); ctx.restore()

  ctx.fillStyle = theme.text
  ctx.font      = `italic ${lyricFS}px Instrument Serif, Georgia, serif`
  let y = lyricY
  for (const l of lines) { ctx.fillText(l, Ws/2, y); y += lineH }

  // Divider
  const divY = lyricY + totalH + (isV ? 52 : 40)
  const divW = isV ? 120 : 90
  ctx.strokeStyle = hexToRgba(theme.accent, .4); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(Ws/2-divW/2, divY); ctx.lineTo(Ws/2+divW/2, divY); ctx.stroke()

  // Song
  const songFS = isV ? 32 : (isL ? 30 : 28)
  ctx.fillStyle = theme.text
  ctx.font = `700 ${songFS}px Syne, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText((song || 'Song Name').toUpperCase(), Ws/2, divY + (isV ? 44 : 36))

  // Artist
  ctx.fillStyle = theme.sub
  ctx.font = `400 ${isV ? 26 : 22}px Lora, Georgia, serif`
  ctx.fillText(artist || 'Artist', Ws/2, divY + (isV ? 44 : 36) + songFS + 18)

  // Footer
  const footerY = Hs - Math.round(Math.min(Ws, Hs) * .055)
  ctx.strokeStyle = hexToRgba(theme.accent, .08); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(bPad+40, footerY-22); ctx.lineTo(Ws-bPad-40, footerY-22); ctx.stroke()
  ctx.fillStyle = hexToRgba(theme.accent, .42)
  ctx.font = `400 ${isV ? 22 : 18}px Lora, Georgia, serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('trymargo.com', Ws/2, footerY)
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}
function adjustBrightness(hex: string, f: number): string {
  const r = Math.min(255,Math.round(parseInt(hex.slice(1,3),16)*f))
  const g = Math.min(255,Math.round(parseInt(hex.slice(3,5),16)*f))
  const b = Math.min(255,Math.round(parseInt(hex.slice(5,7),16)*f))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

export function CardExportModal({
  open, onOpenChange, lyric = '', song = '', artist = '', postId,
}: CardExportModalProps) {
  const [theme, setTheme]   = useState('midnight-gold')
  const [shape, setShape]   = useState('square')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const previewRef          = useRef<HTMLCanvasElement>(null)

  const url       = postId ? `https://trymargo.com/lyric-back?postId=${postId}` : 'https://trymargo.com'
  const copyText  = lyric ? `"${lyric}" — ${artist}, ${song}` : ''
  const shareText = lyric ? `"${lyric.substring(0,60)}" — trymargo.com` : 'trymargo.com'

  useEffect(() => {
    if (!open || !previewRef.current) return
    drawCard(previewRef.current, lyric, song, artist, theme, shape, 1).catch(console.error)
  }, [open, lyric, song, artist, theme, shape])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const off = document.createElement('canvas')
      await drawCard(off, lyric, song, artist, theme, shape, 2)
      off.toBlob(blob => {
        if (!blob) return
        const slug = (song||'Lyric').trim().replace(/[^a-z0-9\s]/gi,'').split(/\s+/).slice(0,4).join('-').toLowerCase()
        const u = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = u; a.download = `MARGO_${slug}_${SHAPES[shape].label}.png`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(u), 5000)
      }, 'image/png')
    } finally { setSaving(false) }
  }, [lyric, song, artist, theme, shape, saving])

  const handleCopy = useCallback(async () => {
    if (!copyText) return
    await navigator.clipboard.writeText(copyText)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }, [copyText])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'MARGO', text: shareText, url }); return }
      catch(e: any) { if (e.name === 'AbortError') return }
    }
    await navigator.clipboard.writeText(url)
  }, [shareText, url])

  if (!open) return null

  const ps = SHAPES[shape]

  return (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position:'fixed', inset:0, zIndex:200,
        background:'rgba(7,6,10,0.9)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        animation:'ceIn 200ms ease',
      }}
    >
      <style>{`
        @keyframes ceIn   { from{opacity:0}to{opacity:1} }
        @keyframes ceUp   { from{transform:translateY(36px);opacity:0}to{transform:translateY(0);opacity:1} }
        @keyframes ceFade { from{transform:translateY(10px) scale(0.988);opacity:0}to{transform:translateY(0) scale(1);opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @media(min-width:600px){
          .ce-sheet{
            border-radius:18px!important;
            border-bottom:1px solid rgba(255,255,255,0.06)!important;
            animation:ceFade 260ms cubic-bezier(0.16,1,0.3,1)!important;
            margin-bottom:20px!important;
          }
        }
        .ce-th:hover  { opacity:1!important; border-color:rgba(255,255,255,0.2)!important; }
        .ce-sh:hover  { border-color:rgba(255,255,255,0.2)!important; }
        .ce-btn:hover { filter:brightness(1.1); }
        .ce-themes::-webkit-scrollbar { display:none; }
      `}</style>

      <div
        className="ce-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:'460px',
          background:'#0F0E13',
          border:'1px solid rgba(255,255,255,0.07)',
          borderBottom:'none',
          borderRadius:'18px 18px 0 0',
          animation:'ceUp 300ms cubic-bezier(0.16,1,0.3,1)',
          fontFamily:'var(--font-lora), Lora, serif',
        }}
      >
        {/* Handle */}
        <div style={{ width:'28px', height:'3px', borderRadius:'2px', background:'rgba(255,255,255,0.07)', margin:'9px auto 0' }} />

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px 0' }}>
          <p style={{ fontSize:'0.78rem', fontWeight:600, color:'rgba(255,255,255,0.55)', letterSpacing:'0.2px' }}>Share Card</p>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              width:'28px', height:'28px', borderRadius:'50%',
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.07)',
              color:'rgba(255,255,255,0.35)', fontSize:'0.95rem',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}
          >×</button>
        </div>

        <div style={{ padding:'12px 16px' }}>

          {/* Preview */}
          <div style={{ borderRadius:'9px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)', marginBottom:'12px' }}>
            <canvas ref={previewRef} style={{ width:'100%', aspectRatio:`${ps.w}/${ps.h}`, display:'block' }} />
          </div>

          {/* Theme row — single line, scrollable if needed but fits on most screens */}
          <div style={{ marginBottom:'10px' }}>
            <p style={{ fontSize:'0.5rem', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'7px' }}>Theme</p>
            <div className="ce-themes" style={{ display:'flex', gap:'5px', overflowX:'auto', scrollbarWidth:'none' }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className="ce-th"
                  onClick={() => setTheme(t.id)}
                  style={{
                    display:'flex', alignItems:'center', gap:'4px',
                    padding:'4px 9px',
                    background: theme === t.id ? hexToRgba(t.accent, .1) : 'transparent',
                    border:`1px solid ${theme === t.id ? hexToRgba(t.accent, .4) : 'rgba(255,255,255,0.06)'}`,
                    borderRadius:'50px', cursor:'pointer', transition:'all 130ms',
                    opacity: theme === t.id ? 1 : 0.6,
                    flexShrink:0,
                  }}
                >
                  <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:t.accent }} />
                  <span style={{
                    fontSize:'0.62rem',
                    color: theme === t.id ? t.accent : 'rgba(255,255,255,0.55)',
                    fontWeight: theme === t.id ? 600 : 400,
                    whiteSpace:'nowrap',
                  }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shape row */}
          <div style={{ marginBottom:'12px' }}>
            <p style={{ fontSize:'0.5rem', fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:'7px' }}>Shape</p>
            <div style={{ display:'flex', gap:'7px' }}>
              {Object.entries(SHAPES).map(([id, s]) => (
                <button
                  key={id}
                  className="ce-sh"
                  onClick={() => setShape(id)}
                  style={{
                    flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
                    padding:'8px 4px',
                    background: shape === id ? 'rgba(232,197,71,0.06)' : 'transparent',
                    border:`1px solid ${shape === id ? 'rgba(232,197,71,0.38)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius:'9px', cursor:'pointer', transition:'all 130ms',
                  }}
                >
                  <div style={{
                    width:  id==='wide'?'20px':id==='vertical'?'12px':'15px',
                    height: id==='wide'?'11px':id==='vertical'?'20px':'15px',
                    border:`1.5px solid ${shape===id?'#E8C547':'rgba(255,255,255,0.22)'}`,
                    borderRadius:'2px', flexShrink:0,
                  }} />
                  <div>
                    <p style={{ fontSize:'0.62rem', color:shape===id?'#E8C547':'rgba(255,255,255,0.45)', fontWeight:600 }}>{s.label}</p>
                    <p style={{ fontSize:'0.5rem', color:'rgba(255,255,255,0.18)', marginTop:'1px' }}>{s.ratio}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:'7px', paddingBottom:'env(safe-area-inset-bottom, 12px)' }}>
            <button
              className="ce-btn"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                padding:'11px 8px',
                background:'#E8C547', color:'#07060A',
                borderRadius:'10px', border:'none',
                cursor:saving?'default':'pointer',
                fontFamily:'var(--font-lora), serif', fontWeight:700, fontSize:'0.7rem',
                opacity:saving?.7:1, transition:'all 150ms',
                boxShadow:'0 2px 14px rgba(232,197,71,0.18)',
              }}
            >
              {saving
                ? <><span style={{ width:'11px', height:'11px', border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'#07060A', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} /> Saving…</>
                : 'Save Card'
              }
            </button>

            <button
              className="ce-btn"
              onClick={handleCopy}
              style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                padding:'11px 8px',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.07)',
                color:copied?'#E8C547':'rgba(255,255,255,0.55)',
                borderRadius:'10px', cursor:'pointer',
                fontFamily:'var(--font-lora), serif', fontWeight:600, fontSize:'0.7rem',
                transition:'all 150ms',
              }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>

            <button
              className="ce-btn"
              onClick={handleShare}
              style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                padding:'11px 8px',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.07)',
                color:'rgba(255,255,255,0.55)',
                borderRadius:'10px', cursor:'pointer',
                fontFamily:'var(--font-lora), serif', fontWeight:600, fontSize:'0.7rem',
                transition:'all 150ms',
              }}
            >
              Share
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

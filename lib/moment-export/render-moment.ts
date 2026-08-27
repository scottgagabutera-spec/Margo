import type { PostLine } from '@/lib/post-lines'
import {
  composeMoment,
  type MomentComposition,
} from '@/lib/moment/compose'
import type { NormalizedMomentLine } from '@/lib/moment/types'
import {
  buildCanvasTextMeasure,
  resolveStageCardLayout,
  STAGE_CARD_EXPORT_WIDTH,
} from '@/lib/moment-export/layout'
import { renderStageCardFrame } from '@/lib/moment-export/render-stage-card-frame'

export { STAGE_CARD_EXPORT_WIDTH }

export type ComposeMomentLineInput = { lyric: string; songName?: string | null; artistName?: string | null; artworkUrl?: string | null }
export type MomentLineInput = ComposeMomentLineInput | PostLine

export type NormalizedLine = NormalizedMomentLine

export type Composition = MomentComposition
export { composeMoment }

export function normalizeLine(l: MomentLineInput): NormalizedLine {
  if ('text' in l) {
    return {
      lyric: l.text || '',
      songTitle: l.songTitle || '',
      artistName: l.artistName || '',
      artworkUrl: l.artworkUrl ?? null,
    }
  }
  return {
    lyric: l.lyric || '',
    songTitle: l.songName || '',
    artistName: l.artistName || '',
    artworkUrl: l.artworkUrl ?? null,
  }
}
export interface ExportTheme {
  id: string
  label: string
  bg: string
  ink: string
  inkMuted: string
  accent: string
  light: boolean
}

export const THEMES: ExportTheme[] = [
  { id: 'gold', label: 'Margo Gold', bg: '#E8C547', ink: '#07060A', inkMuted: 'rgba(7,6,10,0.62)', accent: '#07060A', light: true },
  { id: 'dark', label: 'Margo Dark', bg: '#07060A', ink: '#F4F1ED', inkMuted: 'rgba(244,241,237,0.6)', accent: '#E8C547', light: false },
]

/* ─── Shapes ────────────────────────────────────────────────── */
export const SHAPES = [
  { id: 'square',   label: 'Square',  ratio: '1:1',   w: 1080, h: 1080 },
  { id: 'vertical', label: 'Story',   ratio: '9:16',  w: 1080, h: 1920 },
  { id: 'wide',     label: 'Wide',    ratio: '16:9',  w: 1920, h: 1080 },
]

/* ─── Font loader ────────────────────────────────────────────── */
async function waitForFonts() {
  if (typeof document === 'undefined') return
  try { await (document as any).fonts.ready } catch {}
}

/**
 * next/font/local (the `geist` package) generates a hashed font-family
 * name, not a literal "Geist" — unlike next/font/google's Lora/Sora,
 * which keep their real names. Canvas can't read CSS variables, so
 * resolve the actual loaded family from the CSS var it publishes.
 */
function resolveGeistFontFamily(): string {
  if (typeof document === 'undefined') return 'sans-serif'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-geist-sans').trim()
  return v ? `${v}, sans-serif` : 'sans-serif'
}

const MARGO_GOLD = '#E8C547'
const MARGO_INK = '#0B0B0D'

/* ─── Draw the Margo Symbol on canvas (Tier 2 — card-export rule) ─────
 * Card exports use the Symbol only: circle + M-waveform + dash. No
 * wordmark — MARGO_BRAND.md's logo-usage table specifies Symbol (not
 * Lockup) for card export, and "trymargo.com" already carries the brand
 * cue in a more socially useful (typeable/linkable) form than a second,
 * redundant wordmark would.
 *
 * Two canonical, brand-approved treatments — not a random recolor:
 *   'on-dark'  — gold circle (#E8C547), dark M/dash (#0B0B0D). The
 *                literal brand mark, for dark export backgrounds.
 *   'on-light' — inverted: dark circle (#0B0B0D), gold M/dash (#E8C547),
 *                for light/gold export backgrounds. Same two canonical
 *                colors, same construction, only which element carries
 *                which color changes — this is not a new color, and it's
 *                the same "dark ink on light bg, gold on dark bg" rule
 *                the trymargo.com watermark text already follows a few
 *                lines below. Previously the circle was always filled
 *                with the theme's `accent` (dark for the gold theme),
 *                producing a dark circle with the already-dark M drawn
 *                on top of it — zero internal contrast, which is why the
 *                mark read as "lost" on gold exports. Inverting for
 *                light backgrounds gives the mark its own contrast
 *                against any background instead of relying on alpha
 *                blending to save a same-hue-as-background circle. */
function drawMargoSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, variant: 'on-dark' | 'on-light' = 'on-dark') {
  const circleColor = variant === 'on-light' ? MARGO_INK : MARGO_GOLD
  const markColor = variant === 'on-light' ? MARGO_GOLD : MARGO_INK
  const r = size / 2
  const cx = x + r, cy = y + r
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
  // Dash
  ctx.fillStyle = markColor
  ctx.globalAlpha = 0.55
  const dw = 10 * sc, dh = 3.5 * sc
  ctx.beginPath()
  ctx.roundRect(cx - dw / 2, cy + (60 - 40) * sc - dh / 2, dw, dh, 1.75 * sc)
  ctx.fill()
  ctx.restore()
}

/* ─── Artwork tile — matches Stage Moment card (rounded square beside lyric) ─ */
async function loadArtworkImage(url: string): Promise<HTMLImageElement | null> {
  if (!url || typeof document === 'undefined') return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function drawArtworkTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  radius: number,
  light: boolean,
) {
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, radius)
  if (img) {
    ctx.clip()
    ctx.drawImage(img, x, y, size, size)
  } else {
    ctx.fillStyle = light ? 'rgba(7,6,10,0.1)' : 'rgba(255,255,255,0.08)'
    ctx.fill()
  }
  ctx.restore()
}

/* ─── Wrap / truncate text ──────────────────────────────────── */
function breakLongToken(ctx: CanvasRenderingContext2D, token: string, maxW: number): string[] {
  if (!token) return []
  if (ctx.measureText(token).width <= maxW) return [token]
  const chunks: string[] = []
  let chunk = ''
  for (const ch of token) {
    const test = chunk + ch
    if (ctx.measureText(test).width > maxW && chunk) {
      chunks.push(chunk)
      chunk = ch
    } else {
      chunk = test
    }
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

function wrapText(ctx: CanvasRenderingContext2D, txt: string, maxW: number): string[] {
  const words = txt.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const segments = breakLongToken(ctx, word, maxW)
    for (const segment of segments) {
      const test = line ? line + ' ' + segment : segment
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line)
        line = segment
      } else {
        line = test
      }
    }
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['']
}

/** Binary-search truncation with ellipsis — canvas has no CSS
 * text-overflow, so long song/artist names need this explicitly or they
 * simply run off the canvas edge (or into the logo's protected area). */
function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const t = (text || '').trim()
  if (!t) return ''
  if (ctx.measureText(t).width <= maxWidth) return t
  let lo = 0, hi = t.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = t.slice(0, mid).trimEnd() + '…'
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo <= 0 ? '…' : t.slice(0, lo).trimEnd() + '…'
}

/* ─── Decorative motif primitives — small, quiet, never louder than the lyric ─ */

function drawArcMotif(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, radius * 0.012)
  ctx.beginPath()
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.35)
  ctx.stroke()
  ctx.restore()
}

function drawDiagonalMotif(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(6, Math.min(W, H) * 0.02)
  ctx.beginPath()
  ctx.moveTo(W * 0.62, -20)
  ctx.lineTo(W + 20, H * 0.38)
  ctx.stroke()
  ctx.restore()
}

function drawLetterformMotif(ctx: CanvasRenderingContext2D, cx: number, cy: number, letter: string, size: number, color: string, alpha: number, family: string) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.font = `700 ${Math.round(size)}px ${family}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter.toUpperCase(), cx, cy)
  ctx.restore()
}

function drawWordMotif(ctx: CanvasRenderingContext2D, cx: number, cy: number, maxWidth: number, word: string, color: string, alpha: number, family: string) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  const upper = word.toUpperCase()
  let fontSize = Math.round(maxWidth / Math.max(1, upper.length * 0.62))
  ctx.font = `700 ${fontSize}px ${family}`
  const measured = ctx.measureText(upper).width
  if (measured > maxWidth && measured > 0) {
    fontSize = Math.round(fontSize * (maxWidth / measured))
    ctx.font = `700 ${fontSize}px ${family}`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(upper, cx, cy)
  ctx.restore()
}

/* ─── Content-aware fit — "measure, then place" ───────────────────────
 * Font scale used to be a fixed fraction of canvas size, nudged ±18% by a
 * 3-bucket length guess. That's why a 2-word lyric sat small in a huge
 * empty square: the frame, margins, and metadata position never moved,
 * only the font twitched slightly. This measures the *actual* rendered
 * lyric + metadata at successively smaller scales, starting from an
 * aspirational size the content deserves, until the whole flowed
 * composition (every line's lyric + its own song/artist + stitch
 * dividers) actually fits the available height. Width comes from the
 * caller (archetype-specific column), so a short lyric can also get a
 * narrower column instead of stretching edge-to-edge just because it's
 * been scaled up. */

/** Aspirational starting scale (fraction of min(W,H)) before any
 * shrink-to-fit — this is what decides "a short lyric should feel like a
 * strong visual focal point", not the shrink loop itself. */
function aspirationalFontFraction(totalChars: number, lineCount: number): number {
  if (lineCount === 1) {
    if (totalChars <= 20) return 0.105
    if (totalChars <= 45) return 0.078
    if (totalChars <= 80) return 0.058
    if (totalChars <= 120) return 0.046
    return 0.036
  }
  // Multi-line Moments must hold every line's lyric + metadata together as
  // one composition, so the aspirational scale starts more conservatively
  // than a single line of the same average length would.
  const perLine = totalChars / lineCount
  const base = perLine <= 45 ? 0.05 : perLine <= 80 ? 0.04 : 0.032
  return lineCount >= 3 ? base * 0.85 : base * 0.94
}

interface FittedLine {
  wrapped: string[]
  lyricBlockH: number
  songText: string
  artistText: string
  hasMeta: boolean
}

interface FitResult {
  lyricFS: number
  songFS: number
  artistFS: number
  lyricLineH: number
  lines: FittedLine[]
  totalH: number
  dividerH: number
}

function fitMomentComposition(
  ctx: CanvasRenderingContext2D,
  lines: NormalizedLine[],
  geist: string,
  maxTextWidth: number,
  maxContentHeight: number,
  minDim: number,
): FitResult {
  const totalChars = lines.reduce((s, l) => s + l.lyric.trim().length, 0)
  let scale = aspirationalFontFraction(totalChars, lines.length)
  const floorScale = 0.018
  const dividerH = Math.max(20, Math.round(minDim * 0.03))

  let result: FitResult | null = null
  for (let attempt = 0; attempt < 26; attempt++) {
    const lyricFS = Math.max(Math.round(minDim * scale), Math.round(minDim * floorScale))
    const songFS = Math.max(10, Math.round(lyricFS * 0.6))
    const artistFS = Math.max(9, Math.round(lyricFS * 0.44))
    const lyricLineH = Math.round(lyricFS * 1.42)
    const metaGap = Math.round(lyricFS * 0.24)

    ctx.font = `italic ${lyricFS}px Lora, serif`
    const fitted: FittedLine[] = lines.map((l) => {
      const wrapped = wrapText(ctx, l.lyric.trim(), maxTextWidth)
      const lyricBlockH = wrapped.length * lyricLineH
      ctx.font = `700 ${songFS}px ${geist}`
      const songText = truncateToWidth(ctx, l.songTitle, maxTextWidth)
      ctx.font = `400 ${artistFS}px ${geist}`
      const artistText = truncateToWidth(ctx, l.artistName, maxTextWidth)
      ctx.font = `italic ${lyricFS}px Lora, serif`
      const hasMeta = !!(songText || artistText)
      return { wrapped, lyricBlockH, songText, artistText, hasMeta }
    })

    const metaBlockH = Math.round(songFS * 1.25) + Math.round(artistFS * 1.3)
    const totalH =
      fitted.reduce((sum, f) => sum + f.lyricBlockH + metaGap + (f.hasMeta ? metaBlockH : 0), 0) +
      dividerH * Math.max(0, lines.length - 1)

    result = { lyricFS, songFS, artistFS, lyricLineH, lines: fitted, totalH, dividerH }
    if (totalH <= maxContentHeight || scale <= floorScale) break
    scale *= 0.92
  }
  return result as FitResult
}

/* ─── Draw a Moment poster (1 or many lines) ──────────────────────────
 * The Moment's export identity: Lora italic lyric (hero), Geist for
 * everything else — song/artist follow SongMeta's hierarchy, attached to
 * the line they belong to rather than pinned near the canvas bottom. The
 * Margo Symbol keeps a protected corner that content is measured to
 * avoid. Composition (alignment, scale, motif) comes from composeMoment;
 * exact scale/placement comes from fitMomentComposition, which measures
 * the real content instead of assuming a fixed template. A single-line
 * `lines` array is exactly the individual-card case — same function,
 * same rules, so cards stay part of one visual family. */
export async function drawMomentPoster(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  lines: NormalizedLine[],
  theme: ExportTheme,
  vibeLabel: string | null | undefined,
  seedKey: string,
  compositionOverride?: MomentComposition,
) {
  await waitForFonts()
  const geist = resolveGeistFontFamily()
  const { bg, ink, inkMuted, accent, light } = theme
  const composition = compositionOverride || composeMoment(vibeLabel, lines, seedKey)
  const { archetype, motif } = composition
  const minDim = Math.min(W, H)

  // Flat background — clean and confident, not a busy poster
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Subtle vignette only on the dark theme; the gold theme stays flat
  if (!light) {
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.88)
    vig.addColorStop(0, 'rgba(0,0,0,0)')
    vig.addColorStop(1, 'rgba(0,0,0,0.26)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, W, H)
  }

  // Frame
  ctx.strokeStyle = light ? 'rgba(7,6,10,0.16)' : 'rgba(232,197,71,0.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(44, 44, W - 88, H - 88)

  // Protected zone — the Margo Symbol's corner plus a safety margin.
  // Content is measured to end above this band, regardless of archetype
  // or how much text there is, so metadata can never collide with the
  // logo the way a fixed bottom-anchored position previously could.
  const markSize = Math.round(minDim * 0.036)
  const logoPad = Math.round(minDim * 0.052)
  const bottomBandH = logoPad + markSize + Math.round(minDim * 0.05)

  const framePad = Math.round(minDim * 0.11)
  const contentTop = framePad
  const contentBottom = H - bottomBandH
  const maxContentHeight = Math.max(1, contentBottom - contentTop)

  // Per-archetype horizontal geometry — alignment/personality is still the
  // archetype's job; the fit function below decides the actual scale.
  let hPad: number, maxTextWidth: number
  const align: 'center' | 'left' = archetype === 'centered' ? 'center' : 'left'
  if (archetype === 'centered') {
    hPad = Math.round(W * 0.14)
    maxTextWidth = W - hPad * 2
    // A single very-short lyric shouldn't stretch edge-to-edge just
    // because it's been scaled up — a narrower column keeps a 2-3 word
    // line feeling composed rather than a full-bleed banner.
    if (lines.length === 1 && lines[0].lyric.trim().length <= 24) {
      maxTextWidth = Math.round(maxTextWidth * 0.8)
    }
  } else if (archetype === 'bold') {
    hPad = Math.round(W * 0.1)
    maxTextWidth = W - hPad - Math.round(W * 0.12)
  } else {
    hPad = Math.round(W * 0.12)
    maxTextWidth = Math.round(W * (lines.length > 1 ? 0.56 : 0.5))
  }

  const primaryArtworkUrl = lines.length === 1 ? (lines[0].artworkUrl || '').trim() : ''
  const hasArtwork = primaryArtworkUrl.length > 0
  const artworkImg = hasArtwork ? await loadArtworkImage(primaryArtworkUrl) : null
  const artSize = Math.round(minDim * 0.052)
  const artRadius = Math.round(artSize * 0.18)
  const artGap = Math.round(minDim * 0.013)
  const artReserve = hasArtwork ? artSize + artGap : 0

  const fit = fitMomentComposition(
    ctx,
    lines,
    geist,
    hasArtwork ? Math.max(1, maxTextWidth - artReserve) : maxTextWidth,
    maxContentHeight,
    minDim,
  )
  const anchorX = align === 'center' ? W / 2 : hPad
  const textAlign: CanvasTextAlign = align

  let lineAnchorX = anchorX
  let artX = 0
  if (hasArtwork) {
    if (align === 'center') {
      ctx.font = `italic ${fit.lyricFS}px Lora, serif`
      let maxLw = 0
      for (const wline of fit.lines[0].wrapped) {
        maxLw = Math.max(maxLw, ctx.measureText(wline).width)
      }
      const rowW = artSize + artGap + maxLw
      artX = (W - rowW) / 2
      lineAnchorX = artX + artSize + artGap
    } else {
      artX = hPad
      lineAnchorX = hPad + artSize + artGap
    }
  }

  // Decorative motif — drawn behind the content, per archetype
  const motifColor = light ? 'rgba(7,6,10,1)' : accent
  const motifAlpha = motif === 'letterform' ? 0.05 : motif === 'word' ? 0.07 : 0.16
  const firstLine = lines[0]
  if (archetype === 'centered') {
    if (motif === 'arc') drawArcMotif(ctx, W / 2, H / 2, minDim * 0.36, motifColor, motifAlpha)
    else if (motif === 'letterform') drawLetterformMotif(ctx, W / 2, H / 2, (firstLine.songTitle || firstLine.lyric || 'M').charAt(0), minDim * 0.62, motifColor, motifAlpha, geist)
  } else if (archetype === 'bold') {
    if (motif === 'diagonal') drawDiagonalMotif(ctx, W, H, motifColor, motifAlpha)
    else if (motif === 'letterform') drawLetterformMotif(ctx, W * 0.82, H * 0.78, (firstLine.songTitle || firstLine.lyric || 'M').charAt(0), minDim * 0.5, motifColor, motifAlpha, geist)
  } else {
    if (motif === 'word' && vibeLabel) drawWordMotif(ctx, W * 0.78, contentTop + maxContentHeight * 0.5, W * 0.32, vibeLabel, motifColor, motifAlpha, geist)
    else if (motif === 'arc') drawArcMotif(ctx, W * 0.8, H * 0.5, minDim * 0.28, motifColor, motifAlpha)
  }

  // Vibe label — single-line Moments only. Multi-line compositions keep
  // focus on the lines themselves rather than repeating the vibe.
  if (vibeLabel && lines.length === 1) {
    const vibeFS = Math.round(minDim * 0.016)
    const startY = archetype === 'centered'
      ? contentTop + Math.max(0, (maxContentHeight - fit.totalH) / 2)
      : contentTop + Math.max(0, (maxContentHeight - fit.totalH) / 2)
    ctx.font = `700 ${vibeFS}px ${geist}`
    ctx.fillStyle = accent
    ctx.globalAlpha = 0.82
    ctx.letterSpacing = '2px'
    ctx.textAlign = textAlign
    ctx.fillText(vibeLabel.toUpperCase(), anchorX, Math.max(contentTop + vibeFS, startY - vibeFS * 1.4))
    ctx.letterSpacing = '0px'
    ctx.globalAlpha = 1
  }

  // Flow the lyric/metadata content — vertically centered within the
  // protected content area for every archetype. Centering (rather than a
  // fixed top or bottom anchor) is what lets a short lyric read as
  // deliberate and a long one use the available height efficiently,
  // without ever entering the logo's protected band.
  const startY = contentTop + Math.max(0, (maxContentHeight - fit.totalH) / 2)

  if (hasArtwork) {
    const artY = startY + Math.max(0, Math.round((fit.totalH - artSize) / 2))
    drawArtworkTile(ctx, artworkImg, artX, artY, artSize, artRadius, light)
  }

  ctx.textAlign = textAlign
  ctx.textBaseline = 'alphabetic'
  let y = startY
  fit.lines.forEach((fl, i) => {
    const tx = hasArtwork && i === 0 ? lineAnchorX : anchorX
    ctx.font = `italic ${fit.lyricFS}px Lora, serif`
    ctx.fillStyle = ink
    let ly = y + fit.lyricFS * 0.92
    for (const wline of fl.wrapped) {
      ctx.fillText(wline, tx, ly)
      ly += fit.lyricLineH
    }
    y += fl.lyricBlockH + Math.round(fit.lyricFS * 0.24)

    if (fl.songText) {
      ctx.font = `700 ${fit.songFS}px ${geist}`
      ctx.fillStyle = ink
      ctx.fillText(fl.songText, tx, y + fit.songFS * 0.85)
      y += Math.round(fit.songFS * 1.25)
    }
    if (fl.artistText) {
      ctx.font = `400 ${fit.artistFS}px ${geist}`
      ctx.fillStyle = inkMuted
      ctx.fillText(fl.artistText, tx, y + fit.artistFS * 0.85)
      y += Math.round(fit.artistFS * 1.3)
    }

    if (i < fit.lines.length - 1) {
      // Stitch divider — the same "stitch" grammar PostCard and
      // ComposeMomentCard already use for multi-line Moments, so the
      // exported poster and the in-app UI share one visual language.
      const stitchFS = Math.max(10, Math.round(minDim * 0.014))
      const stitchY = y + Math.round(fit.dividerH * 0.55)
      ctx.font = `700 ${stitchFS}px ${geist}`
      ctx.fillStyle = inkMuted
      ctx.globalAlpha = 0.7
      ctx.textAlign = 'center'
      ctx.fillText('· stitch ·', W / 2, stitchY)
      ctx.globalAlpha = 1
      ctx.textAlign = textAlign
      y += fit.dividerH
    }
  })

  // Watermark text — same anchor for every archetype, a constant brand cue
  const wmFS = Math.round(minDim * 0.018)
  ctx.font = `400 ${wmFS}px ${geist}`
  ctx.fillStyle = light ? 'rgba(7,6,10,0.55)' : 'rgba(232,197,71,0.7)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('trymargo.com', W / 2, H - Math.round(bottomBandH * 0.42))

  // Margo Symbol — bottom-left, ghost opacity per brand rule, background-
  // aware canonical treatment (see drawMargoSymbol).
  ctx.globalAlpha = 0.18
  drawMargoSymbol(ctx, logoPad, H - logoPad - markSize, markSize, light ? 'on-light' : 'on-dark')
  ctx.globalAlpha = 1
}

/* ─── Draw dual-card — chat bubble layout ─────────────────────
 * Lyric Back's reply card. Composition/colors intentionally untouched
 * in this pass — only the logo draw call was updated to the corrected
 * Symbol-only, canonical-color implementation (same bug, same fix). */
export async function drawDualCard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  parentLyric: string, parentSong: string, parentArtist: string,
  replyLyric: string, replySong: string, replyArtist: string,
  theme: ExportTheme,
) {
  await waitForFonts()

  const themeColor = theme.accent
  const themeBg = theme.bg
  const isLight = theme.light

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

  // Margo Symbol — top left, Symbol only (no wordmark), background-aware
  const logoBase = Math.min(W, H)
  const markSize = Math.round(logoBase * 0.028)
  const logoPad = Math.round(logoBase * 0.052)
  ctx.globalAlpha = 0.28
  drawMargoSymbol(ctx, logoPad, logoPad, markSize, isLight ? 'on-light' : 'on-dark')
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
  function bubbleContentH(lyric: string): number {
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
  const b1H = bubbleContentH(parentLyric)
  const b2H = bubbleContentH(replyLyric)
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

/* ─── Download helper — shared by the combined export and both
 * individual-card export actions, so the blob→file→click dance only
 * lives in one place. ─────────────────────────────────────────────── */
function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      resolve()
    }, 'image/png')
  })
}

function slugify(text: string, fallback: string): string {
  const s = (text || '').trim().replace(/[^a-z0-9\s]/gi, '').split(/\s+/).slice(0, 3).join('-').toLowerCase()
  return s || fallback
}

export interface RenderMomentOptions {
  lines: NormalizedLine[]
  themeId?: string
  shapeId?: string
  vibeLabel?: string | null
  seedKey?: string
  scale?: number
  /** stage-card matches StageMomentCard UI; poster is legacy multi-line export (deferred) */
  variant?: 'poster' | 'stage-card'
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Stage Moment card — uses shared resolveStageCardLayout + renderStageCardFrame.
 * Content-hugging height at STAGE_CARD_EXPORT_WIDTH (not a square poster).
 */
export async function measureStageMomentCardHeight(
  lines: NormalizedLine[],
  vibeLabel: string | null | undefined,
  width = STAGE_CARD_EXPORT_WIDTH,
): Promise<number> {
  if (typeof document === 'undefined') return Math.round(width * 0.72)
  await waitForFonts()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return Math.round(width * 0.72)
  const line = lines[0]
  if (!line) return Math.round(width * 0.72)
  const geist = resolveGeistFontFamily()
  const layout = resolveStageCardLayout({
    lyric: line.lyric,
    songTitle: line.songTitle,
    artistName: line.artistName,
    artworkUrl: line.artworkUrl,
    vibeLabel,
    outputWidthPx: width,
    includeVibePill: !!vibeLabel,
  }, buildCanvasTextMeasure(ctx), geist)
  return layout.outputHeight
}

async function renderStageMomentCardToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderMomentOptions,
): Promise<void> {
  const W = STAGE_CARD_EXPORT_WIDTH
  const SCALE = options.scale ?? 2
  const line = options.lines[0]
  if (!line) return

  await waitForFonts()
  const measureCanvas = document.createElement('canvas')
  const measureCtx = measureCanvas.getContext('2d')
  if (!measureCtx) return
  const geist = resolveGeistFontFamily()
  const layout = resolveStageCardLayout({
    lyric: line.lyric,
    songTitle: line.songTitle,
    artistName: line.artistName,
    artworkUrl: line.artworkUrl,
    vibeLabel: options.vibeLabel,
    themeId: options.themeId,
    outputWidthPx: W,
    includeVibePill: !!options.vibeLabel,
  }, buildCanvasTextMeasure(measureCtx), geist)

  const H = layout.outputHeight
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(SCALE, SCALE)

  const artworkImg = line.artworkUrl ? await loadArtworkImage(line.artworkUrl) : null
  renderStageCardFrame(ctx, layout, { artworkImage: artworkImg })
}

export async function renderMomentToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderMomentOptions,
): Promise<void> {
  if (options.variant === 'stage-card') {
    await renderStageMomentCardToCanvas(canvas, options)
    return
  }

  const theme = THEMES.find((t) => t.id === (options.themeId || 'gold')) || THEMES[0]
  const shape = SHAPES.find((s) => s.id === (options.shapeId || 'square')) || SHAPES[0]
  const { w, h } = shape
  const SCALE = options.scale ?? 2
  canvas.width = w * SCALE
  canvas.height = h * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(SCALE, SCALE)
  const seedKey = options.seedKey || options.lines.map((l) => l.lyric + '|' + l.songTitle).join('~') || 'moment'
  const composition = composeMoment(options.vibeLabel, options.lines, seedKey)
  await drawMomentPoster(ctx, w, h, options.lines, theme, options.vibeLabel, seedKey, composition)
}

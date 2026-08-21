'use client'
import { CloseIcon, ChevronRightIcon } from '@/components/icons'
import { recordCardExport } from '@/lib/engagement/card-exports'
import type { PostLine } from '@/lib/post-lines'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

/** Compose's own draft shape (song/artist not yet a real post) or an
 * already-created post's PostLine — CardExportModal accepts either so
 * callers never have to remap field names just to request an export. */
type ComposeMomentLineInput = { lyric: string; songName?: string | null; artistName?: string | null }
type MomentLineInput = ComposeMomentLineInput | PostLine

interface NormalizedLine {
  lyric: string
  songTitle: string
  artistName: string
}

function normalizeLine(l: MomentLineInput): NormalizedLine {
  if ('text' in l) {
    return { lyric: l.text || '', songTitle: l.songTitle || '', artistName: l.artistName || '' }
  }
  return { lyric: l.lyric || '', songTitle: l.songName || '', artistName: l.artistName || '' }
}

interface CardExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lyric?: string
  song?: string
  artist?: string
  postId?: string
  /** Selected vibe label (e.g. "Heartbreak") — small accent caption. Compose only. */
  vibeLabel?: string | null
  /** Full ordered Moment — when present (and non-empty), this is the
   * source of truth for the export; lyric/song/artist above become the
   * fallback for single-line callers that haven't been updated. */
  lines?: MomentLineInput[]
  // Lyric Back dual-card: if these are present, canvas draws parent + reply
  parentLyric?: string
  parentSong?: string
  parentArtist?: string
}

/* ─── Themes ─────────────────────────────────────────────────
 * Two Margo-native themes only. Gold is the export's signature —
 * loud here on purpose, unlike the app's own restrained gold usage.
 * `light` drives ink/vignette/frame decisions instead of string-
 * matching a specific background hex. */
interface ExportTheme {
  id: string
  label: string
  bg: string
  ink: string
  inkMuted: string
  accent: string
  light: boolean
}

const THEMES: ExportTheme[] = [
  { id: 'gold', label: 'Margo Gold', bg: '#E8C547', ink: '#07060A', inkMuted: 'rgba(7,6,10,0.62)', accent: '#07060A', light: true },
  { id: 'dark', label: 'Margo Dark', bg: '#07060A', ink: '#F4F1ED', inkMuted: 'rgba(244,241,237,0.6)', accent: '#E8C547', light: false },
]

/* ─── Shapes ────────────────────────────────────────────────── */
const SHAPES = [
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

/* ─── Wrap / truncate text ──────────────────────────────────── */
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

/* ─── Composition engine ────────────────────────────────────────────
 * Every export is a Margo Moment, not an instance of "the gold template".
 * Vibe family + content decide which of a small set of art-directed
 * archetypes is *appropriate* for this Moment (a weighted likelihood, not
 * a fixed lookup); the Moment's own identity (its post id, or its content
 * when no id exists yet) then picks a specific archetype and decorative
 * motif from within that weighted range. Two Moments of the same vibe and
 * length can still look different from each other. The same Moment always
 * renders the same way, every time it's reopened — deterministic, not
 * random-per-render.
 *
 * This is deliberately NOT "vibe = color". Color stays Margo Gold / Margo
 * Dark. Vibe and content influence alignment, scale, negative space, and
 * which (if any) geometric motif appears — the composition, not the
 * palette. Actual font scale, wrap width, and metadata position are then
 * solved per-render by measuring the real content (see fitMomentComposition)
 * rather than being fixed fractions of the canvas — a short lyric and a
 * long lyric assigned the same archetype should still look nothing alike. */

type Archetype = 'centered' | 'bold' | 'editorial'
type Motif = 'arc' | 'diagonal' | 'letterform' | 'word' | 'none'
type LengthBucket = 'short' | 'medium' | 'long'
type VibeFamily = 'uplifting' | 'reflective' | 'heavy' | 'release'

/** Same grouping used for the Feeling screen's pill order. */
const VIBE_FAMILY: Record<string, VibeFamily> = {
  chill: 'uplifting', hope: 'uplifting', healing: 'uplifting', grateful: 'uplifting',
  joy: 'uplifting', love: 'uplifting', hype: 'uplifting', proud: 'uplifting',
  spiritual: 'reflective', nostalgia: 'reflective',
  heartbreak: 'heavy', pain: 'heavy', loneliness: 'heavy', lost: 'heavy', rage: 'heavy',
  'send it': 'release', 'let out': 'release',
}

/** Which archetype is *likely* for a vibe family — not which one it always gets. */
const FAMILY_BASE_WEIGHTS: Record<VibeFamily, Record<Archetype, number>> = {
  uplifting:  { centered: 50, bold: 30, editorial: 20 },
  reflective: { centered: 60, bold: 15, editorial: 25 },
  heavy:      { centered: 20, bold: 25, editorial: 55 },
  release:    { centered: 15, bold: 60, editorial: 25 },
}

/** Content shifts those odds further — a long or multi-line Moment should
 * strongly favor the column-based Editorial archetype regardless of vibe,
 * and a short lyric shouldn't be stranded in a sparse column. */
const LENGTH_MULTIPLIER: Record<LengthBucket, Record<Archetype, number>> = {
  short:  { centered: 1.2, bold: 1.3, editorial: 0.5 },
  medium: { centered: 1,   bold: 1,   editorial: 1 },
  long:   { centered: 0.8, bold: 0.7, editorial: 2.0 },
}

/** Each archetype's compatible decorative primitives — including "none",
 * so a plain, undecorated card stays a real possibility, not a rarity. */
const ARCHETYPE_MOTIF_WEIGHTS: Record<Archetype, Record<Motif, number>> = {
  centered:  { arc: 40, letterform: 30, none: 30, diagonal: 0, word: 0 },
  bold:      { diagonal: 50, letterform: 25, none: 25, arc: 0, word: 0 },
  editorial: { word: 40, arc: 30, none: 30, diagonal: 0, letterform: 0 },
}

/** Extra lines behave like additional length for archetype-weighting
 * purposes — a 3-line Moment should lean toward Editorial the same way a
 * long single line does. This governs which archetype/motif is likely,
 * not the actual font scale (see aspirationalFontFraction for that). */
function lengthBucketOf(totalChars: number, lineCount: number): LengthBucket {
  const effective = totalChars + (lineCount - 1) * 40
  if (effective < 60) return 'short'
  if (effective < 130) return 'medium'
  return 'long'
}

/** Small deterministic string hash — reproducible, not cryptographic. */
function hashSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

function pickWeighted<T extends string>(weights: Record<T, number>, pick0to999: number): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let cursor = (pick0to999 / 1000) * total
  for (const [key, weight] of entries) {
    cursor -= weight
    if (cursor <= 0) return key
  }
  return entries[entries.length - 1][0]
}

interface Composition {
  archetype: Archetype
  motif: Motif
}

function composeMoment(vibeLabel: string | null | undefined, lines: NormalizedLine[], seedKey: string): Composition {
  const family = VIBE_FAMILY[(vibeLabel || '').toLowerCase().trim()] || 'uplifting'
  const totalChars = lines.reduce((sum, l) => sum + l.lyric.trim().length, 0)
  const bucket = lengthBucketOf(totalChars, lines.length)
  const base = FAMILY_BASE_WEIGHTS[family]
  const mult = LENGTH_MULTIPLIER[bucket]
  const weights: Record<Archetype, number> = {
    centered: base.centered * mult.centered,
    bold: base.bold * mult.bold,
    editorial: base.editorial * mult.editorial,
  }
  // Independent salted hashes, not two slices of one hash — post ids are
  // often sequential/similar-looking, and integer-dividing a single hash
  // to derive a second value correlates badly in exactly that case (a run
  // of nearby ids would all land on the same motif). Hashing the seed key
  // with a different suffix per decision keeps them properly independent.
  const archetype = pickWeighted<Archetype>(weights, hashSeed(`${seedKey}:archetype`) % 1000)
  const motif = pickWeighted<Motif>(ARCHETYPE_MOTIF_WEIGHTS[archetype], hashSeed(`${seedKey}:motif`) % 1000)
  return { archetype, motif }
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
async function drawMomentPoster(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  lines: NormalizedLine[],
  theme: ExportTheme,
  vibeLabel: string | null | undefined,
  seedKey: string,
  compositionOverride?: Composition,
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

  const fit = fitMomentComposition(ctx, lines, geist, maxTextWidth, maxContentHeight, minDim)
  const anchorX = align === 'center' ? W / 2 : hPad
  const textAlign: CanvasTextAlign = align

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

  ctx.textAlign = textAlign
  ctx.textBaseline = 'alphabetic'
  let y = startY
  fit.lines.forEach((fl, i) => {
    ctx.font = `italic ${fit.lyricFS}px Lora, serif`
    ctx.fillStyle = ink
    let ly = y + fit.lyricFS * 0.92
    for (const wline of fl.wrapped) {
      ctx.fillText(wline, anchorX, ly)
      ly += fit.lyricLineH
    }
    y += fl.lyricBlockH + Math.round(fit.lyricFS * 0.24)

    if (fl.songText) {
      ctx.font = `700 ${fit.songFS}px ${geist}`
      ctx.fillStyle = ink
      ctx.fillText(fl.songText, anchorX, y + fit.songFS * 0.85)
      y += Math.round(fit.songFS * 1.25)
    }
    if (fl.artistText) {
      ctx.font = `400 ${fit.artistFS}px ${geist}`
      ctx.fillStyle = inkMuted
      ctx.fillText(fl.artistText, anchorX, y + fit.artistFS * 0.85)
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
async function drawDualCard(
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

export function CardExportModal({
  open, onOpenChange,
  lyric = '', song = '', artist = '',
  postId,
  vibeLabel,
  lines,
  parentLyric, parentSong, parentArtist,
}: CardExportModalProps) {
  const [theme, setTheme] = useState('gold')
  const [shape, setShape] = useState('square')
  const [copied, setCopied] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  // "Export all" downloads are sequential, not guaranteed — some browsers
  // prompt for permission or silently block downloads past the first one
  // triggered without a fresh user gesture. This surfaces progress instead
  // of a single button press that might quietly produce fewer files than
  // expected with no explanation.
  const [exportAllProgress, setExportAllProgress] = useState<{ done: number; total: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const carouselCanvasRef = useRef<HTMLCanvasElement>(null)

  const isDualCard = !!(parentLyric && parentSong && parentArtist)
  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0]
  const activeShape = SHAPES.find(s => s.id === shape) || SHAPES[0]

  // The full ordered Moment — source of truth for the poster. Falls back
  // to the singular lyric/song/artist props for callers that only ever
  // had one line to begin with (karaoke line share, Lyric Back replies).
  const momentLines = useMemo<NormalizedLine[]>(() => {
    const fromProp = (lines || []).map(normalizeLine).filter(l => l.lyric.trim().length > 0)
    if (fromProp.length > 0) return fromProp
    if (lyric && lyric.trim()) return [{ lyric, songTitle: song, artistName: artist }]
    return []
  }, [lines, lyric, song, artist])

  const isMulti = !isDualCard && momentLines.length > 1

  // One archetype/motif decision for the whole Moment, shared by the
  // combined poster and every individual card, so the carousel reads as
  // one visual family instead of each card independently re-rolling its
  // own personality from just its own (much shorter) content.
  const composition = useMemo<Composition | null>(() => {
    if (isDualCard || momentLines.length === 0) return null
    const seed = postId || momentLines.map(l => `${l.lyric}|${l.songTitle}|${l.artistName}`).join('~')
    return composeMoment(vibeLabel, momentLines, seed)
  }, [isDualCard, momentLines, vibeLabel, postId])

  useEffect(() => {
    if (carouselIndex >= momentLines.length) setCarouselIndex(0)
  }, [momentLines.length, carouselIndex])

  const url = postId ? `https://trymargo.com/post/${postId}` : 'https://trymargo.com'
  const copyText = isDualCard
    ? `"${parentLyric}" ↩ "${lyric}" — trymargo.com`
    : momentLines.length > 0
      ? momentLines.map(l => `"${l.lyric}"${l.artistName ? ' — ' + l.artistName : ''}${l.songTitle ? ', ' + l.songTitle : ''}`).join('  ·  ') + ' — trymargo.com'
      : ''

  /* ─── Render helpers ────────────────────────────────────────── */
  const paintMoment = useCallback(async (
    canvas: HTMLCanvasElement,
    linesToPaint: NormalizedLine[],
    seedKey: string,
  ) => {
    const { w, h } = activeShape
    const SCALE = 2
    canvas.width = w * SCALE
    canvas.height = h * SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(SCALE, SCALE)
    await drawMomentPoster(ctx, w, h, linesToPaint, activeTheme, vibeLabel, seedKey, composition || undefined)
  }, [activeShape, activeTheme, vibeLabel, composition])

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { w, h } = activeShape
    const SCALE = 2
    canvas.width = w * SCALE
    canvas.height = h * SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(SCALE, SCALE)

    if (isDualCard) {
      await drawDualCard(
        ctx, w, h,
        parentLyric!, parentSong!, parentArtist!,
        lyric, song, artist,
        activeTheme
      )
    } else if (momentLines.length > 0) {
      // postId as the composition seed when it exists — same Moment,
      // same archetype/motif every time it's reopened.
      await drawMomentPoster(ctx, w, h, momentLines, activeTheme, vibeLabel, postId ? `${postId}:combined` : 'combined', composition || undefined)
    }
  }, [activeShape, activeTheme, isDualCard, parentLyric, parentSong, parentArtist, lyric, song, artist, momentLines, vibeLabel, postId, composition])

  useEffect(() => {
    if (open) renderCanvas()
  }, [open, renderCanvas])

  useEffect(() => {
    if (!open || !isMulti) return
    const canvas = carouselCanvasRef.current
    const line = momentLines[carouselIndex]
    if (!canvas || !line) return
    void paintMoment(canvas, [line], postId ? `${postId}:card${carouselIndex}` : `card${carouselIndex}`)
  }, [open, isMulti, carouselIndex, momentLines, paintMoment, postId])

  /* ─── Export actions ────────────────────────────────────────── */
  const filenameFor = useCallback((suffix?: string) => {
    const primary = momentLines[0]
    const base = momentLines.length > 1 ? 'Moment' : slugify(primary?.songTitle || '', 'Lyric')
    const parts = ['MARGO', base]
    if (suffix) parts.push(suffix)
    parts.push(activeShape.label)
    return `${parts.join('_')}.png`
  }, [momentLines, activeShape])

  const handleSave = useCallback(async () => {
    await renderCanvas()
    const canvas = canvasRef.current
    if (!canvas) return
    if (isDualCard) {
      const slugReply = slugify(song, 'Lyric')
      const slugParent = slugify(parentSong || '', 'Lyric')
      await downloadCanvas(canvas, `MARGO_${slugParent}_LyricBack_${slugReply}_${activeShape.label}.png`)
    } else {
      await downloadCanvas(canvas, filenameFor())
    }
    void recordCardExport({ postId, theme, shape })
  }, [renderCanvas, isDualCard, song, parentSong, activeShape, filenameFor, postId, theme, shape])

  const handleExportCard = useCallback(async (index: number) => {
    const line = momentLines[index]
    if (!line) return
    const canvas = document.createElement('canvas')
    await paintMoment(canvas, [line], postId ? `${postId}:card${index}` : `card${index}`)
    await downloadCanvas(canvas, filenameFor(momentLines.length > 1 ? `card${index + 1}of${momentLines.length}` : undefined))
    void recordCardExport({ postId, theme, shape })
  }, [momentLines, paintMoment, postId, filenameFor, theme, shape])

  const handleExportAllCards = useCallback(async () => {
    if (exportAllProgress) return
    const total = momentLines.length
    setExportAllProgress({ done: 0, total })
    try {
      for (let i = 0; i < total; i++) {
        // Sequential, with a short stagger — back-to-back synchronous
        // download triggers are the pattern browsers are most likely to
        // flag as "this site is trying to download multiple files," and
        // some browsers block anything past the first without prompting.
        // There's no reliable way to detect a silently-blocked download
        // from JS, so this can't guarantee all N files arrive — showing
        // progress at least tells the user what was attempted instead of
        // a single button press that might quietly produce fewer files.
        // eslint-disable-next-line no-await-in-loop
        await handleExportCard(i)
        setExportAllProgress({ done: i + 1, total })
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    } finally {
      setTimeout(() => setExportAllProgress(null), 900)
    }
  }, [momentLines.length, handleExportCard, exportAllProgress])

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

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-lora), serif', fontSize: '0.6rem', fontWeight: 700,
    color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase',
  }

  // Compact-but-premium button base: touch-target height comes from
  // minHeight, not padding, so tightening padding never drops below the
  // 44px accessible minimum — the goal is less air AROUND controls, not
  // smaller tap targets.
  const btnBase: React.CSSProperties = {
    minHeight: 'var(--margo-touch-min)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 14px', borderRadius: '50px', fontFamily: 'var(--font-lora), serif',
    fontSize: '0.58rem', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(7,6,10,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
      onClick={() => onOpenChange(false)}
    >
      {/* Sheet — the poster gets the space; chrome around it stays tight so
          this fits a phone viewport without the user scrolling past
          buttons just to reach the next control. Outer scroll stays only
          as a fallback for content that genuinely can't fit (e.g. a
          multi-line carousel on a very short viewport). */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--surface, #0F0E13)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          borderRadius: '24px 24px 0 0',
          padding: '0 0 calc(14px + var(--margo-page-bottom))',
          display: 'flex', flexDirection: 'column',
          maxHeight: '94dvh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 0' }}>
          <p style={sectionLabelStyle}>
            {isDualCard ? 'Lyric Back Card' : 'Share your Moment'}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            style={{ width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxSizing: 'border-box' }}
          ><CloseIcon size={14} color="var(--text-secondary)" /></button>
        </div>

        {/* Combined poster preview — the dominant element. Height responds
            to the viewport instead of a flat cap, so Story/portrait gets
            real visible room instead of a cramped scroll window. */}
        <div style={{ margin: '10px 16px 0', borderRadius: '12px', overflow: 'hidden', background: '#07060A', position: 'relative', maxHeight: 'min(46dvh, 380px)', overflowY: 'auto' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', aspectRatio: `${activeShape.w} / ${activeShape.h}`, display: 'block' }}
          />
        </div>

        {/* Theme + Shape — one compact row each, tight to the poster above
            them rather than separated by large section gaps. */}
        <div style={{ display: 'flex', gap: '10px', padding: '10px 16px 0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...sectionLabelStyle, marginBottom: '6px' }}>Theme</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    ...btnBase, flex: 1, gap: '6px', padding: '0 8px',
                    background: theme === t.id ? 'rgba(232,197,71,0.12)' : 'rgba(255,255,255,0.03)',
                    border: theme === t.id ? '1px solid rgba(232,197,71,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 150ms ease', textTransform: 'none', letterSpacing: 0,
                  }}
                >
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.bg, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.7rem', color: theme === t.id ? '#E8C547' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.label.replace('Margo ', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ ...sectionLabelStyle, marginBottom: '6px' }}>Shape</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {SHAPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setShape(s.id)}
                  aria-label={`${s.label} (${s.ratio})`}
                  style={{
                    ...btnBase, flex: 1, padding: '0 6px',
                    background: shape === s.id ? 'rgba(232,197,71,0.1)' : 'rgba(255,255,255,0.03)',
                    border: shape === s.id ? '1px solid rgba(232,197,71,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 150ms ease', textTransform: 'none', letterSpacing: 0,
                    color: shape === s.id ? '#E8C547' : 'rgba(255,255,255,0.5)', fontSize: '0.7rem',
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary export action — the poster is the hero; this is one
            clear, compact CTA plus two lightweight secondary controls, not
            three equally-weighted buttons. */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px 0' }}>
          <button
            onClick={handleSave}
            style={{ ...btnBase, flex: 2, background: '#E8C547', color: '#07060A', border: 'none', fontWeight: 700 }}
          >{isDualCard ? 'Save Card' : 'Export Moment'}</button>
          <button
            onClick={handleCopy}
            style={{ ...btnBase, flex: 1, background: 'rgba(255,255,255,0.05)', color: copied ? '#E8C547' : 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, transition: 'color 150ms ease' }}
          >{copied ? 'Copied' : 'Copy'}</button>
          <button
            onClick={handleShare}
            style={{ ...btnBase, flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}
          >Share</button>
        </div>

        {/* Individual-card carousel — optional secondary presentation,
            only when the Moment actually has more than one line. The
            combined poster above remains the default; this never appears
            before the user has already seen it. Visually subordinate: a
            small preview and two compact ghost buttons, not another set
            of primary-weight CTAs. */}
        {isMulti && (
          <div style={{ padding: '12px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <p style={sectionLabelStyle}>Share the lines separately?</p>
              <span style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {carouselIndex + 1} / {momentLines.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                aria-label="Previous card"
                onClick={() => setCarouselIndex(i => (i - 1 + momentLines.length) % momentLines.length)}
                style={{ width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
                  <ChevronRightIcon size={16} color="var(--text-secondary)" />
                </span>
              </button>

              <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', background: '#07060A', maxHeight: 'min(30dvh, 220px)' }}>
                <canvas
                  ref={carouselCanvasRef}
                  style={{ width: '100%', aspectRatio: `${activeShape.w} / ${activeShape.h}`, display: 'block' }}
                />
              </div>

              <button
                type="button"
                aria-label="Next card"
                onClick={() => setCarouselIndex(i => (i + 1) % momentLines.length)}
                style={{ width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <ChevronRightIcon size={16} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => handleExportCard(carouselIndex)}
                disabled={!!exportAllProgress}
                style={{ ...btnBase, flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, opacity: exportAllProgress ? 0.5 : 1, cursor: exportAllProgress ? 'not-allowed' : 'pointer' }}
              >This card</button>
              <button
                onClick={handleExportAllCards}
                disabled={!!exportAllProgress}
                style={{ ...btnBase, flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, opacity: exportAllProgress ? 0.7 : 1, cursor: exportAllProgress ? 'not-allowed' : 'pointer' }}
              >{exportAllProgress ? `${exportAllProgress.done}/${exportAllProgress.total}…` : 'All cards'}</button>
            </div>
            {exportAllProgress && (
              <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
                If your browser blocks multiple downloads, allow them when prompted.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

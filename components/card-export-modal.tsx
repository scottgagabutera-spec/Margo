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
  /** Selected vibe label (e.g. "Heartbreak") — small accent caption. Compose only. */
  vibeLabel?: string | null
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
  ctx.font = `700 ${Math.round(size * 0.35)}px Sora, sans-serif`
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

/* ─── Composition engine ────────────────────────────────────────────
 * Every export is a Margo Moment, not an instance of "the gold template".
 * Vibe family + lyric length decide which of a small set of art-directed
 * archetypes is *appropriate* for this Moment (a weighted likelihood, not
 * a fixed lookup); the Moment's own identity (its post id, or its content
 * when no id exists yet) then picks a specific archetype and decorative
 * motif from within that weighted range. Two Moments of the same vibe and
 * length can still look different from each other. The same Moment always
 * renders the same way, every time it's reopened — deterministic, not
 * random-per-render.
 *
 * This is deliberately NOT "vibe = color". Color stays Margo Gold / Margo
 * Dark. Vibe and length influence alignment, scale, negative space, and
 * which (if any) geometric motif appears — the composition, not the palette. */

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

/** Length shifts those odds further — a long lyric should strongly favor
 * the column-based Editorial archetype regardless of vibe, and a short
 * lyric shouldn't be stranded in a sparse column. */
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

function lengthBucketOf(lyric: string): LengthBucket {
  const n = (lyric || '').trim().length
  if (n < 60) return 'short'
  if (n < 110) return 'medium'
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

function composeMoment(vibeLabel: string | null | undefined, lyric: string, seedKey: string): Composition {
  const family = VIBE_FAMILY[(vibeLabel || '').toLowerCase().trim()] || 'uplifting'
  const bucket = lengthBucketOf(lyric)
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

/* ─── Draw single-lyric card ────────────────────────────────── *
 * The Moment's export identity: Lora italic lyric (hero), Geist for
 * everything else — song/artist follow SongMeta's hierarchy, logo
 * watermark bottom-left per brand rule. Composition (alignment, scale,
 * motif) comes from composeMoment() above — this function lays out
 * whichever archetype it's given; it doesn't choose one. */
async function drawSingleCard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  lyric: string, song: string, artist: string,
  theme: ExportTheme,
  vibeLabel?: string | null,
  seedKey?: string,
) {
  await waitForFonts()
  const geist = resolveGeistFontFamily()
  const { bg, ink, inkMuted, accent, light } = theme
  const { archetype, motif } = composeMoment(vibeLabel, lyric, seedKey || `${lyric}|${song}|${artist}`)
  const bucket = lengthBucketOf(lyric)
  const lengthScale = bucket === 'long' ? 0.82 : bucket === 'short' ? 1.05 : 1
  const motifColor = light ? 'rgba(7,6,10,1)' : accent
  const motifAlpha = motif === 'letterform' ? 0.05 : motif === 'word' ? 0.07 : 0.16

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

  // Decorative motif — drawn behind the lyric, per archetype
  if (archetype === 'centered') {
    if (motif === 'arc') drawArcMotif(ctx, W / 2, H / 2, Math.min(W, H) * 0.36, motifColor, motifAlpha)
    else if (motif === 'letterform') drawLetterformMotif(ctx, W / 2, H / 2, (song || lyric || 'M').charAt(0), Math.min(W, H) * 0.62, motifColor, motifAlpha, geist)
  } else if (archetype === 'bold') {
    if (motif === 'diagonal') drawDiagonalMotif(ctx, W, H, motifColor, motifAlpha)
    else if (motif === 'letterform') drawLetterformMotif(ctx, W * 0.82, H * 0.78, (song || lyric || 'M').charAt(0), Math.min(W, H) * 0.5, motifColor, motifAlpha, geist)
  } else {
    if (motif === 'word' && vibeLabel) drawWordMotif(ctx, W * 0.76, H * 0.5, W * 0.38, vibeLabel, motifColor, motifAlpha, geist)
    else if (motif === 'arc') drawArcMotif(ctx, W * 0.78, H * 0.55, Math.min(W, H) * 0.3, motifColor, motifAlpha)
  }

  if (archetype === 'centered') {
    // Lyric — centered, the closest to a quiet, breathing composition
    const lyricFS = Math.round(Math.min(W, H) * 0.044 * lengthScale)
    ctx.font = `italic ${lyricFS}px Lora, serif`
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxW = W - Math.round(W * 0.22)
    const lines = wrapText(ctx, lyric, maxW)
    const lineH = lyricFS * 1.45
    const totalH = lines.length * lineH
    let y = (H - totalH) / 2 + lyricFS * 0.5 + Math.round(H * 0.02)
    for (const l of lines) { ctx.fillText(l, W / 2, y); y += lineH }

    const metaBaseY = H - Math.round(H * 0.168)
    if (vibeLabel) {
      const vibeFS = Math.round(Math.min(W, H) * 0.016)
      ctx.font = `700 ${vibeFS}px ${geist}`
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.82
      ctx.letterSpacing = '2px'
      ctx.fillText(vibeLabel.toUpperCase(), W / 2, metaBaseY - vibeFS * 1.9)
      ctx.letterSpacing = '0px'
      ctx.globalAlpha = 1
    }
    const songFS = Math.round(Math.min(W, H) * 0.028)
    ctx.font = `700 ${songFS}px ${geist}`
    ctx.fillStyle = ink
    ctx.fillText(song || '', W / 2, metaBaseY)
    const artistFS = Math.round(Math.min(W, H) * 0.02)
    ctx.font = `400 ${artistFS}px ${geist}`
    ctx.fillStyle = inkMuted
    ctx.fillText(artist || '', W / 2, metaBaseY + songFS + 10)

    ctx.strokeStyle = light ? 'rgba(7,6,10,0.18)' : `${accent}33`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(W / 2 - 100, H - Math.round(H * 0.1))
    ctx.lineTo(W / 2 + 100, H - Math.round(H * 0.1))
    ctx.stroke()
  } else if (archetype === 'bold') {
    // Lyric — left-aligned, larger, upper frame. More visual energy.
    const lyricFS = Math.round(Math.min(W, H) * 0.044 * 1.15 * lengthScale)
    const hPad = Math.round(W * 0.1)
    ctx.font = `italic ${lyricFS}px Lora, serif`
    ctx.fillStyle = ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const maxW = W - hPad - Math.round(W * 0.14)
    const lines = wrapText(ctx, lyric, maxW)
    const lineH = lyricFS * 1.35
    let y = Math.round(H * 0.3)
    for (const l of lines) { ctx.fillText(l, hPad, y); y += lineH }

    const metaY = H - Math.round(H * 0.1)
    const songFS = Math.round(Math.min(W, H) * 0.024)
    if (vibeLabel) {
      const vibeFS = Math.round(Math.min(W, H) * 0.015)
      ctx.font = `700 ${vibeFS}px ${geist}`
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.85
      ctx.letterSpacing = '2px'
      ctx.fillText(vibeLabel.toUpperCase(), hPad, metaY - songFS - 14)
      ctx.letterSpacing = '0px'
      ctx.globalAlpha = 1
    }
    ctx.font = `700 ${songFS}px ${geist}`
    ctx.fillStyle = ink
    ctx.fillText(song || '', hPad, metaY)
    const artistFS = Math.round(Math.min(W, H) * 0.018)
    ctx.font = `400 ${artistFS}px ${geist}`
    ctx.fillStyle = inkMuted
    ctx.fillText(artist || '', hPad, metaY + artistFS + 8)
  } else {
    // Editorial column — left-aligned, narrower, runs down the page.
    // Handles long lyrics most gracefully of the three archetypes.
    const lyricFS = Math.round(Math.min(W, H) * 0.044 * 0.92 * lengthScale)
    const hPad = Math.round(W * 0.12)
    const colWidth = Math.round(W * 0.5)
    ctx.font = `italic ${lyricFS}px Lora, serif`
    ctx.fillStyle = ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    const lines = wrapText(ctx, lyric, colWidth)
    const lineH = lyricFS * 1.4
    const totalH = lines.length * lineH
    let y = Math.max(Math.round(H * 0.24), (H - totalH) / 2)
    for (const l of lines) { ctx.fillText(l, hPad, y); y += lineH }

    y += 10
    const songFS = Math.round(Math.min(W, H) * 0.024)
    ctx.font = `700 ${songFS}px ${geist}`
    ctx.fillStyle = ink
    ctx.fillText(song || '', hPad, y)
    const artistFS = Math.round(Math.min(W, H) * 0.018)
    ctx.font = `400 ${artistFS}px ${geist}`
    ctx.fillStyle = inkMuted
    ctx.fillText(artist || '', hPad, y + artistFS + 8)
  }

  // Watermark — same anchor for every archetype, a constant brand cue
  const wmFS = Math.round(Math.min(W, H) * 0.018)
  ctx.font = `400 ${wmFS}px ${geist}`
  ctx.fillStyle = light ? 'rgba(7,6,10,0.55)' : 'rgba(232,197,71,0.7)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('trymargo.com', W / 2, H - Math.round(H * 0.068))

  // Ghost logo — bottom-left, opacity 0.18, per brand rule
  const logoBase = Math.min(W, H)
  const markSize = Math.round(logoBase * 0.032)
  const logoPad  = Math.round(logoBase * 0.052)
  ctx.globalAlpha = 0.18
  drawMargoLockup(ctx, logoPad, H - logoPad - markSize, markSize, accent)
  ctx.globalAlpha = 1
}

/* ─── Draw dual-card — chat bubble layout ─────────────────────
 * Lyric Back's reply card. Composition/colors intentionally untouched
 * in this pass — only threading the new theme shape through so both
 * Margo Gold and Margo Dark keep rendering correctly. */
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
  vibeLabel,
  parentLyric, parentSong, parentArtist,
}: CardExportModalProps) {
  const [theme, setTheme] = useState('gold')
  const [shape, setShape] = useState('square')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isDualCard = !!(parentLyric && parentSong && parentArtist)
  const activeTheme = THEMES.find(t => t.id === theme) || THEMES[0]
  const activeShape = SHAPES.find(s => s.id === shape) || SHAPES[0]

  const url = postId ? `https://trymargo.com/post/${postId}` : 'https://trymargo.com'
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
        activeTheme
      )
    } else {
      // postId as the composition seed when it exists — same Moment,
      // same archetype/motif every time it's reopened.
      await drawSingleCard(ctx, w, h, lyric, song, artist, activeTheme, vibeLabel, postId)
    }
  }, [theme, shape, lyric, song, artist, parentLyric, parentSong, parentArtist, isDualCard, activeTheme, activeShape, vibeLabel, postId])

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
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.bg, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
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

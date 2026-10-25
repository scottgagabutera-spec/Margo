import { isLivingAtmosphere, type AtmosphereId } from './atmosphere.ts'
import { SHORTS_LOOKS, pickShortsLook } from './shorts-looks.ts'

export type StageCardThemeId = 'gold' | 'blush' | 'sage' | 'dusk'

const THEME_PAINT: Record<
  StageCardThemeId,
  { bg: string; ink: string; inkMuted: string }
> = {
  gold: { bg: '#E8C547', ink: '#07060A', inkMuted: 'rgba(7,6,10,0.62)' },
  blush: { bg: '#E8A8B0', ink: '#2A1218', inkMuted: 'rgba(42,18,24,0.62)' },
  sage: { bg: '#A8C4AE', ink: '#142218', inkMuted: 'rgba(20,34,24,0.62)' },
  dusk: { bg: '#2A2438', ink: '#F4F1ED', inkMuted: 'rgba(244,241,237,0.62)' },
}

const ATMOSPHERE_ROOM = {
  bg: '#07060A',
  ink: '#F4F1ED',
  inkMuted: 'rgba(244,241,237,0.62)',
}

function resolveShortsPaint(themeId: StageCardThemeId, atmosphereId: AtmosphereId) {
  const theme = THEME_PAINT[themeId] ?? THEME_PAINT.gold
  if (isLivingAtmosphere(atmosphereId)) return ATMOSPHERE_ROOM
  return theme
}

export type ShortsChromeTokens = {
  title: string
  artist: string
  icon: string
  progressTrack: string
  progressFill: string
  muteChipBg: string
  muteChipBorder: string
  signupInk: string
  signupBg: string
  signupBorder: string
  centerScrim: string
}

const BRAND_GOLD = '#C9A227'

function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const hex = input.trim()
  if (!hex.startsWith('#')) return null
  const raw = hex.slice(1)
  if (raw.length === 3) {
    return {
      r: parseInt(raw[0] + raw[0], 16),
      g: parseInt(raw[1] + raw[1], 16),
      b: parseInt(raw[2] + raw[2], 16),
    }
  }
  if (raw.length === 6) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    }
  }
  return null
}

function channelLinear(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex)
  if (!rgb) return 0
  const r = channelLinear(rgb.r)
  const g = channelLinear(rgb.g)
  const b = channelLinear(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex)
  const l2 = relativeLuminance(bgHex)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function pickAccentOnBackground(bg: string, ink: string): string {
  if (contrastRatio(BRAND_GOLD, bg) >= 3) return BRAND_GOLD
  if (contrastRatio(ink, bg) >= 3) return ink
  return relativeLuminance(bg) > 0.55 ? '#07060A' : '#F4F1ED'
}

/** Readable chrome colours from the same paint as the lyric stage. */
export function getShortsChromeTokens(
  stageThemeId: StageCardThemeId,
  atmosphereId: AtmosphereId,
): ShortsChromeTokens {
  const paint = resolveShortsPaint(stageThemeId, atmosphereId)
  const accent = pickAccentOnBackground(paint.bg, paint.ink)
  const onDark = relativeLuminance(paint.bg) < 0.35
  return {
    title: paint.ink,
    artist: paint.inkMuted,
    icon: accent,
    progressTrack: onDark ? 'rgba(255,255,255,0.22)' : 'rgba(7,6,10,0.18)',
    progressFill: accent,
    muteChipBg: onDark ? 'rgba(255,255,255,0.12)' : 'rgba(7,6,10,0.42)',
    muteChipBorder: onDark ? 'rgba(255,255,255,0.18)' : 'rgba(7,6,10,0.12)',
    signupInk: onDark ? '#F4F1ED' : '#07060A',
    signupBg: onDark ? 'rgba(255,255,255,0.14)' : 'rgba(7,6,10,0.08)',
    signupBorder: accent,
    centerScrim: onDark ? 'rgba(8,7,12,0.45)' : 'rgba(255,255,255,0.35)',
  }
}

export type ShortsLookContrastReport = {
  lookKey: string
  titleRatio: number
  iconRatio: number
}

/** Every registry look + mode samples must meet WCAG-ish floors. */
export function auditShortsLookContrasts(): ShortsLookContrastReport[] {
  const keys = new Set<string>()
  const reports: ShortsLookContrastReport[] = []
  for (const look of SHORTS_LOOKS) {
    keys.add(`${look.stageThemeId}:${look.atmosphereId}`)
  }
  for (let i = 0; i < 24; i++) {
    const picked = pickShortsLook(`audit-${i}`, 'HOPE', '2026-10-25')
    keys.add(`${picked.stageThemeId}:${picked.atmosphereId}`)
  }
  for (const key of keys) {
    const [theme, atm] = key.split(':') as [StageCardThemeId, AtmosphereId]
    const paint = resolveShortsPaint(theme, atm)
    const tokens = getShortsChromeTokens(theme, atm)
    reports.push({
      lookKey: key,
      titleRatio: contrastRatio(tokens.title, paint.bg),
      iconRatio: contrastRatio(tokens.icon, paint.bg),
    })
  }
  return reports
}

import { contrastRatio, relativeLuminance } from './shorts-chrome-tokens.ts'

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace('#', '')
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

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/** Darken until background reads as a deep tint, never cream on cream. */
export function darkenFeedStripTileBg(baseHex: string): string {
  const rgb = parseHex(baseHex)
  if (!rgb) return '#2A2438'
  let { r, g, b } = rgb
  let hex = toHex(r, g, b)
  let safety = 0
  while (relativeLuminance(hex) > 0.38 && safety < 24) {
    r *= 0.88
    g *= 0.88
    b *= 0.88
    hex = toHex(r, g, b)
    safety += 1
  }
  return hex
}

const LIGHT_INK = '#F4F1ED'
const DARK_INK = '#07060A'

export function feedStripTileInk(bgHex: string): string {
  const light = contrastRatio(LIGHT_INK, bgHex)
  const dark = contrastRatio(DARK_INK, bgHex)
  if (light >= 4.5) return LIGHT_INK
  if (dark >= 4.5) return DARK_INK
  return light >= dark ? LIGHT_INK : DARK_INK
}

/** WCAG contrast targets for body text on flat or scrimmed surfaces. */
export const ADAPTIVE_TEXT_CREAM = '#F4F1ED'
export const ADAPTIVE_TEXT_INK = '#07060A'
export const ADAPTIVE_TEXT_GOLD = '#E8C547'

const MIN_CONTRAST = 4.5

export function parseHexColor(input: string): { r: number; g: number; b: number } | null {
  const s = input.trim()
  const hex = s.startsWith('#') ? s.slice(1) : s
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    return { r, g, b }
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return { r, g, b }
  }
  return null
}

export function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const chan = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * chan(rgb.r) + 0.7152 * chan(rgb.g) + 0.0722 * chan(rgb.b)
}

export function contrastRatio(fg: string, bg: string): number {
  const f = parseHexColor(fg)
  const b = parseHexColor(bg)
  if (!f || !b) return 1
  const l1 = relativeLuminance(f)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export type AdaptiveTextChoice = 'cream' | 'ink' | 'gold'

/**
 * Pick cream, near-black, or gold for text on a solid background (no scrim).
 * Gold is only used when it passes contrast — never gold on gold.
 */
export function adaptiveTextColorOnBackground(bgHex: string): AdaptiveTextChoice {
  const bg = bgHex.trim().toUpperCase()
  if (bg === ADAPTIVE_TEXT_GOLD.toUpperCase() || bg.startsWith('#E8C5')) {
    return contrastRatio(ADAPTIVE_TEXT_INK, bg) >= MIN_CONTRAST ? 'ink' : 'cream'
  }
  const candidates: Array<{ choice: AdaptiveTextChoice; hex: string }> = [
    { choice: 'cream', hex: ADAPTIVE_TEXT_CREAM },
    { choice: 'ink', hex: ADAPTIVE_TEXT_INK },
    { choice: 'gold', hex: ADAPTIVE_TEXT_GOLD },
  ]
  let best: { choice: AdaptiveTextChoice; ratio: number } | null = null
  for (const c of candidates) {
    const ratio = contrastRatio(c.hex, bg)
    if (ratio < MIN_CONTRAST) continue
    if (!best || ratio > best.ratio) best = { choice: c.choice, ratio }
  }
  if (best) return best.choice
  return relativeLuminance(parseHexColor(bgHex) || { r: 0, g: 0, b: 0 }) > 0.5 ? 'ink' : 'cream'
}

export function adaptiveTextCssColor(choice: AdaptiveTextChoice): string {
  if (choice === 'gold') return 'var(--gold)'
  if (choice === 'ink') return ADAPTIVE_TEXT_INK
  return ADAPTIVE_TEXT_CREAM
}

/** Photo / video covers — always use a dark scrim; pick cream or white. */
export function adaptiveTextColorOnPhotoScrim(): 'cream' {
  return 'cream'
}

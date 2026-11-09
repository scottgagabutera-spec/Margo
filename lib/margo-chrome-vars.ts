/** Publish measured chrome heights on :root. Skip writes when unchanged. */

export const MARGO_CHROME_FALLBACK_PX = {
  '--margo-header-h': 72,
  '--nav-height': 72,
  '--margo-header-bottom': 72,
  '--margo-feed-tab-bar-h': 44,
  '--margo-tabbar-h': 80,
} as const

const lastGoodChromePx: Record<string, number> = { ...MARGO_CHROME_FALLBACK_PX }

/** Measured chrome: never publish 0 or a hidden bar — keep the last good reading. */
export function publishRootChromePx(name: keyof typeof MARGO_CHROME_FALLBACK_PX | string, measured: number): void {
  const fallback =
    name in MARGO_CHROME_FALLBACK_PX
      ? MARGO_CHROME_FALLBACK_PX[name as keyof typeof MARGO_CHROME_FALLBACK_PX]
      : 0
  const prior = lastGoodChromePx[name] ?? fallback
  const px = measured > 0 ? measured : prior
  if (measured > 0) lastGoodChromePx[name] = measured
  setRootChromePx(name, px)
}

export function setRootChromePx(name: string, px: number): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const next = `${Math.max(0, Math.round(px))}px`
  if (root.style.getPropertyValue(name) === next) return
  root.style.setProperty(name, next)
}

export const MARGO_CHROME_SELECTORS = {
  feedTabBar: '.margo-feed-content-tab-bar',
  mobileTabBar: '.margo-mobile-tabbar',
} as const

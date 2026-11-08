/** Publish measured chrome heights on :root. Skip writes when unchanged. */

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

/** Visible band height (px) — one source of truth for Compose overlays. */
export const COMPOSE_COMPACT_VISIBLE_H_PX = 520

export type ComposeViewportMetrics = {
  height: number
  offsetTop: number
  layoutHeight: number
  keyboardInset: number
  keyboardLikely: boolean
  compact: boolean
}

export function readComposeViewportMetrics(): ComposeViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      height: 640,
      offsetTop: 0,
      layoutHeight: 640,
      keyboardInset: 0,
      keyboardLikely: false,
      compact: false,
    }
  }
  const vv = window.visualViewport
  const layoutHeight = window.innerHeight
  const height = vv?.height ?? layoutHeight
  const offsetTop = vv?.offsetTop ?? 0
  const keyboardInset = Math.max(0, layoutHeight - height - offsetTop)
  const heightDropped = height < layoutHeight - 48
  const keyboardLikely = keyboardInset >= 36 || heightDropped
  const compact = height < COMPOSE_COMPACT_VISIBLE_H_PX
  return {
    height,
    offsetTop,
    layoutHeight,
    keyboardInset,
    keyboardLikely,
    compact,
  }
}

export function publishComposeViewportCss(metrics: ComposeViewportMetrics, root: HTMLElement) {
  root.style.setProperty('--margo-vv-height', `${Math.round(metrics.height)}px`)
  root.style.setProperty('--margo-vv-offset-top', `${Math.round(metrics.offsetTop)}px`)
  root.style.setProperty('--margo-keyboard-inset', `${Math.round(metrics.keyboardInset)}px`)
  root.style.setProperty('--margo-compose-available-h', `${Math.round(metrics.height)}px`)
  if (metrics.compact) root.setAttribute('data-margo-compose-compact', '1')
  else root.removeAttribute('data-margo-compose-compact')
}

export function scheduleComposeViewportBurst(cb: () => void): () => void {
  const delays = [0, 90, 200, 380]
  const ids = delays.map((ms) => window.setTimeout(cb, ms))
  return () => ids.forEach((id) => window.clearTimeout(id))
}

import type { ReactNode } from 'react'
import type { PrimaryTabId } from '@/lib/primary-tab-paint'

const MAX_DEPTH_PANES = 5
const DEPTH_DEPTH_KEY = 'margo-tab-depth-stack'

export const DISCOVER_INNER = new Set([
  '/discover/songs',
  '/discover/moments',
  '/discover/resonance',
  '/artists',
])

type DepthRecord = {
  path: string
  primaryTab: PrimaryTabId
  node: ReactNode
  at: number
}

const depthPanes = new Map<string, DepthRecord>()

function pathKey(path: string): string {
  return path.split('?')[0].toLowerCase()
}

export function isTabDepthKeepalivePath(path: string | null | undefined): boolean {
  if (!path) return false
  const p = path.split('?')[0]
  if (DISCOVER_INNER.has(p)) return true
  if (p.startsWith('/profile/') && p !== '/profile/edit') return true
  if (p === '/messages' || p.startsWith('/messages/')) return true
  if (p === '/notifications') return true
  return false
}

export function primaryTabForDepthPath(path: string): PrimaryTabId | null {
  const p = path.split('?')[0]
  if (DISCOVER_INNER.has(p) || p === '/discover') return 'discover'
  if (p.startsWith('/profile/')) return 'you'
  if (p === '/messages' || p.startsWith('/messages/') || p === '/notifications') return 'feed'
  return null
}

export function captureTabDepthKeepalive(path: string, node: ReactNode) {
  const key = pathKey(path)
  if (!isTabDepthKeepalivePath(key)) return
  const primaryTab = primaryTabForDepthPath(key)
  if (!primaryTab) return
  depthPanes.delete(key)
  depthPanes.set(key, { path: key, primaryTab, node, at: Date.now() })
  while (depthPanes.size > MAX_DEPTH_PANES) {
    let oldest: string | null = null
    let oldestAt = Number.POSITIVE_INFINITY
    for (const [k, v] of depthPanes) {
      if (v.at < oldestAt) {
        oldestAt = v.at
        oldest = k
      }
    }
    if (oldest) depthPanes.delete(oldest)
    else break
  }
  try {
    sessionStorage.setItem(
      DEPTH_DEPTH_KEY,
      JSON.stringify(
        [...depthPanes.values()].map((v) => ({ path: v.path, primaryTab: v.primaryTab, at: v.at })),
      ),
    )
  } catch {
    /* */
  }
}

export function peekTabDepthKeepalive(path: string): DepthRecord | null {
  return depthPanes.get(pathKey(path)) ?? null
}

export function peekNewestDepthForTab(tab: PrimaryTabId): DepthRecord | null {
  let best: DepthRecord | null = null
  for (const v of depthPanes.values()) {
    if (v.primaryTab !== tab) continue
    if (!best || v.at > best.at) best = v
  }
  return best
}

export function clearTabDepthKeepalive(path: string) {
  depthPanes.delete(pathKey(path))
}

export function clearAllTabDepthKeepalive() {
  depthPanes.clear()
  try {
    sessionStorage.removeItem(DEPTH_DEPTH_KEY)
  } catch {
    /* */
  }
}

/** Persist discover inner path for tab return — cleared only on back to /discover home. */
export { readDiscoverDepth, persistDiscoverDepth, clearDiscoverDepth } from '@/lib/margo-discover-depth'

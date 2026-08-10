'use client'

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { usePathname } from 'next/navigation'

/**
 * Phase 1 — primary-tab keepalive with per-pane scrollports.
 *
 * Each pane (feed | discover | alerts | you) is its own overflow container.
 * scrollTop lives on the element (survives visibility:hidden), so tab switches
 * restore correctly. sessionStorage backs Compose → back / remount cases.
 * history.scrollRestoration is manual while a primary tab is active so the
 * browser does not fight the shell.
 *
 * Inactive panes use visibility:hidden + fixed stacking — not display:none —
 * because display:none makes scrollTop read as 0 and corrupted leave-saves.
 *
 * Leave saves must NOT trust a live scrollTop read after hide/reflow: browsers
 * and scroll-anchoring can mutate it. Freeze the last known-good value in a
 * ref while the pane is active/visible, and restore from that ref on show.
 */

export type PrimaryTabId = 'feed' | 'discover' | 'alerts' | 'you'

const SCROLL_STORAGE_KEY = 'margo-primary-tab-scroll'

export function resolvePrimaryTabId(
  pathname: string | null,
  ownProfileHref: string | null
): PrimaryTabId | null {
  if (!pathname) return null
  if (pathname === '/feed') return 'feed'
  if (pathname === '/discover') return 'discover'
  if (pathname === '/notifications') return 'alerts'
  if (ownProfileHref && pathname === ownProfileHref) return 'you'
  return null
}

/** Active primary pane scroll element, if any. */
export function getActivePrimaryScrollEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector<HTMLElement>(
    '[data-margo-primary-tab][data-margo-primary-tab-active="1"]'
  )
}

/** Read scroll position from the active pane, else the window. */
export function readActiveScrollTop(): number {
  const el = getActivePrimaryScrollEl()
  if (el) return el.scrollTop
  if (typeof window === 'undefined') return 0
  return window.scrollY || document.documentElement.scrollTop || 0
}

/** Scroll the active pane (or window fallback). */
export function scrollActiveTo(top: number, behavior: ScrollBehavior = 'auto') {
  const el = getActivePrimaryScrollEl()
  if (el) {
    el.scrollTo({ top, behavior })
    return
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top, behavior })
  }
}

function readStoredScrollMap(): Partial<Record<PrimaryTabId, number>> {
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<Record<PrimaryTabId, number>>
  } catch {
    return {}
  }
}

function writeStoredScrollMap(map: Partial<Record<PrimaryTabId, number>>) {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* private mode */
  }
}

function persistScroll(
  frozen: Partial<Record<PrimaryTabId, number>>,
  id: PrimaryTabId,
  y: number
) {
  frozen[id] = y
  const map = readStoredScrollMap()
  map[id] = y
  writeStoredScrollMap(map)
}

interface PrimaryTabContextValue {
  activeTab: PrimaryTabId | null
  isTabActive: (id: PrimaryTabId) => boolean
  isOnPrimaryTab: boolean
}

const PrimaryTabContext = createContext<PrimaryTabContextValue>({
  activeTab: null,
  isTabActive: () => false,
  isOnPrimaryTab: false,
})

export function usePrimaryTab() {
  return useContext(PrimaryTabContext)
}

interface PrimaryTabShellProps {
  children: ReactNode
  ownProfileHref: string | null
}

const paneStyle = (active: boolean): CSSProperties => ({
  // Fixed viewport stack — stays sized while hidden so scrollTop is preserved.
  // Do NOT use display:none (reads scrollTop as 0 and corrupted leave-saves).
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',
  // Prevent browser scroll-anchoring from rewriting scrollTop during
  // sibling pane mount / content reflow while this pane is hidden.
  overflowAnchor: 'none',
  boxSizing: 'border-box',
  visibility: active ? 'visible' : 'hidden',
  pointerEvents: active ? 'auto' : 'none',
  // Below tab bar (50) / MiniPlayer (90); above page bg.
  zIndex: active ? 1 : 0,
})

export function PrimaryTabShell({ children, ownProfileHref }: PrimaryTabShellProps) {
  const pathname = usePathname()
  const activeTab = resolvePrimaryTabId(pathname, ownProfileHref)

  const cacheRef = useRef(new Map<PrimaryTabId, ReactNode>())
  const paneElsRef = useRef(new Map<PrimaryTabId, HTMLElement | null>())
  const prevTabRef = useRef<PrimaryTabId | null>(null)
  /** Last known-good scrollTop per pane, captured while the pane was active. */
  const frozenScrollRef = useRef<Partial<Record<PrimaryTabId, number>>>({})
  const [, setCacheVersion] = useState(0)

  // First visit only — keep the mounted tree; ignore later Next remount payloads.
  if (activeTab && !cacheRef.current.has(activeTab)) {
    cacheRef.current.set(activeTab, children)
  }

  useEffect(() => {
    if (!ownProfileHref && cacheRef.current.has('you')) {
      cacheRef.current.delete('you')
      paneElsRef.current.delete('you')
      delete frozenScrollRef.current.you
      const map = readStoredScrollMap()
      delete map.you
      writeStoredScrollMap(map)
      setCacheVersion(v => v + 1)
    }
  }, [ownProfileHref])

  // Manual history restoration while primary tabs own scroll via panes.
  useEffect(() => {
    if (typeof history === 'undefined') return
    if (!activeTab) return
    const prev = history.scrollRestoration
    history.scrollRestoration = 'manual'
    // Keep the document window at 0 — the pane is the scrollport.
    window.scrollTo(0, 0)
    return () => {
      history.scrollRestoration = prev
    }
  }, [activeTab])

  // Flush leaving tab from frozen ref (not post-hide live scrollTop);
  // restore incoming tab from frozen/sessionStorage after hide/reflow.
  useLayoutEffect(() => {
    const prev = prevTabRef.current
    const frozen = frozenScrollRef.current

    if (prev && prev !== activeTab) {
      const el = paneElsRef.current.get(prev)
      // Prefer the freeze taken while active. Only seed from live if we never
      // recorded a value — and never overwrite a non-zero freeze with a 0 read
      // that can appear after hide/reflow.
      const prior = frozen[prev]
      const live = el?.scrollTop ?? 0
      const y =
        prior != null && !(prior > 0 && live === 0) ? prior : live
      persistScroll(frozen, prev, y)
      // Re-apply freeze onto the element in case hide/reflow jumped it.
      if (el && Math.abs(el.scrollTop - y) > 1) {
        el.scrollTop = y
      }
    }

    if (activeTab) {
      const el = paneElsRef.current.get(activeTab)
      if (el) {
        const target =
          frozen[activeTab] ?? readStoredScrollMap()[activeTab] ?? el.scrollTop
        if (target != null && Math.abs(el.scrollTop - target) > 1) {
          el.scrollTop = target
        }
        frozen[activeTab] = target
        // Second pass after layout settles (sibling pane mount / images).
        requestAnimationFrame(() => {
          if (Math.abs(el.scrollTop - target) > 1) {
            el.scrollTop = target
          }
        })
      }
      window.scrollTo(0, 0)
    }

    prevTabRef.current = activeTab
  }, [activeTab, pathname])

  // Continuously freeze + mirror active pane scroll (Compose → back).
  // Ignore scroll events once the pane is no longer the active/visible one
  // so a post-hide jump cannot corrupt the freeze.
  useEffect(() => {
    if (!activeTab) return
    const el = paneElsRef.current.get(activeTab)
    if (!el) return
    const tabId = activeTab

    const onScroll = () => {
      if (el.getAttribute('data-margo-primary-tab-active') !== '1') return
      if (getComputedStyle(el).visibility !== 'visible') return
      persistScroll(frozenScrollRef.current, tabId, el.scrollTop)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    // Seed freeze with whatever the pane currently has while visible.
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeTab, pathname])

  const ctx = useMemo<PrimaryTabContextValue>(
    () => ({
      activeTab,
      isOnPrimaryTab: activeTab !== null,
      isTabActive: (id: PrimaryTabId) => activeTab === id,
    }),
    [activeTab]
  )

  const cached = [...cacheRef.current.entries()]

  return (
    <PrimaryTabContext.Provider value={ctx}>
      {cached.map(([id, node]) => (
        <div
          key={id}
          ref={(nodeEl) => {
            paneElsRef.current.set(id, nodeEl)
          }}
          data-margo-primary-tab={id}
          data-margo-primary-tab-active={activeTab === id ? '1' : '0'}
          aria-hidden={activeTab !== id}
          style={paneStyle(activeTab === id)}
        >
          {node}
        </div>
      ))}

      {activeTab === null ? children : null}
    </PrimaryTabContext.Provider>
  )
}

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
  const [, setCacheVersion] = useState(0)

  // First visit only — keep the mounted tree; ignore later Next remount payloads.
  if (activeTab && !cacheRef.current.has(activeTab)) {
    cacheRef.current.set(activeTab, children)
  }

  useEffect(() => {
    if (!ownProfileHref && cacheRef.current.has('you')) {
      cacheRef.current.delete('you')
      paneElsRef.current.delete('you')
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

  // Persist leaving tab to sessionStorage; restore incoming tab from storage if needed.
  // Safe to read scrollTop here — inactive panes use visibility:hidden (not display:none).
  useLayoutEffect(() => {
    const prev = prevTabRef.current

    if (prev && prev !== activeTab) {
      const el = paneElsRef.current.get(prev)
      if (el) {
        const map = readStoredScrollMap()
        map[prev] = el.scrollTop
        writeStoredScrollMap(map)
      }
    }

    if (activeTab) {
      const el = paneElsRef.current.get(activeTab)
      if (el) {
        const stored = readStoredScrollMap()[activeTab]
        // Prefer live element scrollTop (preserved under visibility:hidden);
        // storage covers remount / full-nav edge cases.
        if (stored != null && stored > 0 && Math.abs(el.scrollTop - stored) > 1) {
          if (el.scrollTop === 0) el.scrollTop = stored
        }
      }
      window.scrollTo(0, 0)
    }

    prevTabRef.current = activeTab
  }, [activeTab, pathname])

  // Continuously mirror active pane scroll into sessionStorage (Compose → back).
  useEffect(() => {
    if (!activeTab) return
    const el = paneElsRef.current.get(activeTab)
    if (!el) return

    const onScroll = () => {
      const map = readStoredScrollMap()
      map[activeTab] = el.scrollTop
      writeStoredScrollMap(map)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
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

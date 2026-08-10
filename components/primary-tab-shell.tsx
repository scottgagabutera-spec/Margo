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
} from 'react'
import { usePathname } from 'next/navigation'

/**
 * SPIKE — Phase 1 primary-tab keepalive (shell wiring only).
 *
 * Goal: prove the riskiest seams before a full Phase 1 build:
 *   1. Keepalive panes vs root providers (auth/audio/notifications/messaging stay
 *      at layout; page trees for primary tabs stay mounted when hidden).
 *   2. Browser back/forward — URL still drives Next; non-primary routes
 *      (Compose, Messages, /post/*, /discover/songs, …) render as normal
 *      {children} while primary panes stay cached off-screen.
 *   3. Scroll restore — window.scrollY saved per logical tab on hide, restored
 *      on show via useLayoutEffect.
 *
 * Non-goals for this spike (explicitly deferred):
 *   - Finger-follow / interruptible swipe rewrite (TabSwipeProvider untouched)
 *   - Pausing page Realtime/effects while hidden (expect Feed usePosts etc. to
 *     stay subscribed — document; Phase 1 full build should use PrimaryTabContext)
 *   - Compose / Messages inside the shell
 *   - Prefetch / content-visibility polish
 *
 * Cache key: logical tab id, not full pathname.
 */

export type PrimaryTabId = 'feed' | 'discover' | 'alerts' | 'you'

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

interface PrimaryTabContextValue {
  activeTab: PrimaryTabId | null
  /** True when this tab’s pane is the visible primary tab. */
  isTabActive: (id: PrimaryTabId) => boolean
  /** True when any keepalive primary tab is showing (not a full-nav route). */
  isOnPrimaryTab: boolean
}

const PrimaryTabContext = createContext<PrimaryTabContextValue>({
  activeTab: null,
  isTabActive: () => false,
  isOnPrimaryTab: false,
})

/** For Phase 1 full build — pages can pause work when inactive. Spike: unused. */
export function usePrimaryTab() {
  return useContext(PrimaryTabContext)
}

interface PrimaryTabShellProps {
  children: ReactNode
  ownProfileHref: string | null
}

export function PrimaryTabShell({ children, ownProfileHref }: PrimaryTabShellProps) {
  const pathname = usePathname()
  const activeTab = resolvePrimaryTabId(pathname, ownProfileHref)

  const cacheRef = useRef(new Map<PrimaryTabId, ReactNode>())
  const scrollRef = useRef(new Map<PrimaryTabId, number>())
  const prevTabRef = useRef<PrimaryTabId | null>(null)
  // Only used when dropping a cached pane (e.g. sign-out clears "you").
  const [, setCacheVersion] = useState(0)

  // First visit only — keep the mounted tree; ignore later Next remount payloads.
  // Mutating the Map during render is intentional (keepalive capture pattern).
  if (activeTab && !cacheRef.current.has(activeTab)) {
    cacheRef.current.set(activeTab, children)
  }

  // Identity change (sign-out / username) must drop the "you" pane.
  useEffect(() => {
    if (!ownProfileHref && cacheRef.current.has('you')) {
      cacheRef.current.delete('you')
      scrollRef.current.delete('you')
      setCacheVersion(v => v + 1)
    }
  }, [ownProfileHref])

  useLayoutEffect(() => {
    const prev = prevTabRef.current
    if (prev && prev !== activeTab) {
      scrollRef.current.set(prev, window.scrollY)
    }
    if (activeTab) {
      const y = scrollRef.current.get(activeTab) ?? 0
      window.scrollTo(0, y)
    }
    prevTabRef.current = activeTab
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
      {/*
        Keepalive panes — hidden with display:none so layout/scroll state in the
        subtree can persist. aria-hidden for a11y while off-screen.
      */}
      {cached.map(([id, node]) => (
        <div
          key={id}
          data-margo-primary-tab={id}
          data-margo-primary-tab-active={activeTab === id ? '1' : '0'}
          aria-hidden={activeTab !== id}
          style={{ display: activeTab === id ? 'block' : 'none' }}
        >
          {node}
        </div>
      ))}

      {/* Full navigation surfaces (Compose, Messages, posts, discover/songs, …) */}
      {activeTab === null ? children : null}
    </PrimaryTabContext.Provider>
  )
}

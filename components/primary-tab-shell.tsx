'use client'

import {
  Activity,
  createContext,
  useCallback,
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
import { usePrimaryTabSwipeGesture } from '@/hooks/usePrimaryTabSwipeGesture'

/**
 * Phase 1 / 1.5 / 2.0 — primary-tab keepalive + Activity + swipe strip.
 *
 * Each pane (feed | discover | alerts | you) is its own overflow container.
 * Visited panes stay mounted; inactive panes use <Activity mode="hidden">
 * so Effects tear down while React state is preserved (#59 enabled gating
 * remains belt-and-suspenders via isTabActive → enabled).
 *
 * Phase 2.0: `peekTab` may paint a neighbor during finger-follow without
 * flipping isTabActive (Realtime stays off until commit). Strip offset is
 * applied via transform on the pane nodes (compositor), not layout.
 *
 * Leave-save still must not trust live scrollTop after Activity hide —
 * freeze while active; peek restore uses frozen values and never leave-saves.
 */

export type PrimaryTabId = 'feed' | 'discover' | 'alerts' | 'you'
export type PrimaryTabPeekDir = 'prev' | 'next'

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
  peekTab: PrimaryTabId | null
  isOnPrimaryTab: boolean
  /** True only for the committed route pane — never for paint-only peek. */
  isTabActive: (id: PrimaryTabId) => boolean
  hasCachedTab: (id: PrimaryTabId) => boolean
  /**
   * Paint neighbor for finger-follow. Returns false if never visited
   * (nothing in keepalive cache) — caller should fall back to commit-only.
   */
  beginPeek: (id: PrimaryTabId, dir: PrimaryTabPeekDir) => boolean
  /** Direct compositor offset in px (finger delta). No React render. */
  setStripOffset: (px: number) => void
  /** Clear peek paint + reset transforms. */
  endPeek: () => void
}

const PrimaryTabContext = createContext<PrimaryTabContextValue>({
  activeTab: null,
  peekTab: null,
  isTabActive: () => false,
  isOnPrimaryTab: false,
  hasCachedTab: () => false,
  beginPeek: () => false,
  setStripOffset: () => {},
  endPeek: () => {},
})

export function usePrimaryTab() {
  return useContext(PrimaryTabContext)
}

interface PrimaryTabShellProps {
  children: ReactNode
  ownProfileHref: string | null
  /** Wire Phase 2 swipe when mounted under TabSwipeProvider. */
  enableSwipeGesture?: boolean
}

const paneStyle = (painted: boolean, isCommittedActive: boolean): CSSProperties => ({
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',
  overflowAnchor: 'none',
  boxSizing: 'border-box',
  // Reserve vertical pan for the browser; horizontal is for tab swipe JS.
  // See TabSwipeProvider / .margo-tab-swipe-viewport notes.
  touchAction: 'pan-y',
  pointerEvents: isCommittedActive ? 'auto' : 'none',
  zIndex: isCommittedActive ? 2 : painted ? 1 : 0,
  // will-change only while a neighbor is painted for follow (set inline during peek).
})

export function PrimaryTabShell({
  children,
  ownProfileHref,
  enableSwipeGesture = false,
}: PrimaryTabShellProps) {
  const pathname = usePathname()
  const activeTab = resolvePrimaryTabId(pathname, ownProfileHref)

  const cacheRef = useRef(new Map<PrimaryTabId, ReactNode>())
  const paneElsRef = useRef(new Map<PrimaryTabId, HTMLElement | null>())
  const prevTabRef = useRef<PrimaryTabId | null>(null)
  /** Last known-good scrollTop per pane, captured while the pane was active. */
  const frozenScrollRef = useRef<Partial<Record<PrimaryTabId, number>>>({})
  const activeTabRef = useRef<PrimaryTabId | null>(activeTab)
  const peekMetaRef = useRef<{ id: PrimaryTabId; dir: PrimaryTabPeekDir } | null>(null)
  const stripOffsetRef = useRef(0)
  const [, setCacheVersion] = useState(0)
  const [peekTab, setPeekTabState] = useState<PrimaryTabId | null>(null)

  activeTabRef.current = activeTab

  // First visit only — keep the mounted tree; ignore later Next remount payloads.
  if (activeTab && !cacheRef.current.has(activeTab)) {
    cacheRef.current.set(activeTab, children)
  }

  const applyStripTransforms = useCallback(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 0
    const off = stripOffsetRef.current
    const peek = peekMetaRef.current
    const active = activeTabRef.current

    for (const [id, el] of paneElsRef.current) {
      if (!el) continue
      if (active && id === active) {
        if (!peek && off === 0) {
          el.style.transform = ''
          el.style.willChange = ''
        } else {
          el.style.transform = 'translate3d(' + off + 'px,0,0)'
          el.style.willChange = 'transform'
        }
        continue
      }
      if (peek && id === peek.id) {
        const base = peek.dir === 'next' ? w : -w
        el.style.transform = 'translate3d(' + (off + base) + 'px,0,0)'
        el.style.willChange = 'transform'
        continue
      }
      el.style.transform = ''
      el.style.willChange = ''
    }
  }, [])

  const endPeek = useCallback(() => {
    peekMetaRef.current = null
    stripOffsetRef.current = 0
    setPeekTabState(null)
    // Transforms cleared after paint in layout effect; also clear now for snappiness.
    for (const el of paneElsRef.current.values()) {
      if (!el) continue
      el.style.transform = ''
      el.style.willChange = ''
    }
  }, [])

  const beginPeek = useCallback(
    (id: PrimaryTabId, dir: PrimaryTabPeekDir) => {
      if (!cacheRef.current.has(id)) return false
      if (id === activeTabRef.current) return false
      peekMetaRef.current = { id, dir }
      setPeekTabState(id)
      applyStripTransforms()
      return true
    },
    [applyStripTransforms]
  )

  const setStripOffset = useCallback(
    (px: number) => {
      stripOffsetRef.current = px
      applyStripTransforms()
    },
    [applyStripTransforms]
  )

  const hasCachedTab = useCallback((id: PrimaryTabId) => cacheRef.current.has(id), [])

  useEffect(() => {
    if (!ownProfileHref && cacheRef.current.has('you')) {
      cacheRef.current.delete('you')
      paneElsRef.current.delete('you')
      delete frozenScrollRef.current.you
      const map = readStoredScrollMap()
      delete map.you
      writeStoredScrollMap(map)
      if (peekMetaRef.current?.id === 'you') endPeek()
      setCacheVersion(v => v + 1)
    }
  }, [ownProfileHref, endPeek])

  // Manual history restoration while primary tabs own scroll via panes.
  useEffect(() => {
    if (typeof history === 'undefined') return
    if (!activeTab) return
    const prev = history.scrollRestoration
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    return () => {
      history.scrollRestoration = prev
    }
  }, [activeTab])

  // Route commit: leave-save previous active; restore incoming; drop any peek.
  useLayoutEffect(() => {
    const prev = prevTabRef.current
    const frozen = frozenScrollRef.current

    // Committed navigation clears visual peek (2.1 may animate first — then clear).
    if (peekMetaRef.current) {
      peekMetaRef.current = null
      stripOffsetRef.current = 0
      setPeekTabState(null)
    }

    if (prev && prev !== activeTab) {
      const el = paneElsRef.current.get(prev)
      const prior = frozen[prev]
      const live = el?.scrollTop ?? 0
      const y = prior != null ? (live === 0 ? prior : live) : live
      persistScroll(frozen, prev, y)
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
        requestAnimationFrame(() => {
          if (Math.abs(el.scrollTop - target) > 1) {
            el.scrollTop = target
          }
        })
      }
      window.scrollTo(0, 0)
    }

    // Reset transforms after commit so panes aren't stuck mid-strip.
    for (const el of paneElsRef.current.values()) {
      if (!el) continue
      el.style.transform = ''
      el.style.willChange = ''
    }

    prevTabRef.current = activeTab
  }, [activeTab, pathname])

  // Peek paint: restore frozen scroll so the neighbor doesn't flash at 0.
  useLayoutEffect(() => {
    if (!peekTab) return
    const el = paneElsRef.current.get(peekTab)
    if (!el) return
    const y = frozenScrollRef.current[peekTab] ?? readStoredScrollMap()[peekTab] ?? 0
    if (Math.abs(el.scrollTop - y) > 1) el.scrollTop = y
    applyStripTransforms()
  }, [peekTab, applyStripTransforms])

  // Continuously freeze + mirror committed-active pane scroll only.
  useEffect(() => {
    if (!activeTab) return
    const el = paneElsRef.current.get(activeTab)
    if (!el) return
    const tabId = activeTab

    const onScroll = () => {
      if (el.getAttribute('data-margo-primary-tab-active') !== '1') return
      if (getComputedStyle(el).display === 'none') return
      persistScroll(frozenScrollRef.current, tabId, el.scrollTop)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeTab, pathname])

  const ctx = useMemo<PrimaryTabContextValue>(
    () => ({
      activeTab,
      peekTab,
      isOnPrimaryTab: activeTab !== null,
      isTabActive: (id: PrimaryTabId) => activeTab === id,
      hasCachedTab,
      beginPeek,
      setStripOffset,
      endPeek,
    }),
    [activeTab, peekTab, hasCachedTab, beginPeek, setStripOffset, endPeek]
  )

  usePrimaryTabSwipeGesture(enableSwipeGesture, ownProfileHref, {
    beginPeek,
    setStripOffset,
    endPeek,
    hasCachedTab,
  })

  const cached = [...cacheRef.current.entries()]

  return (
    <PrimaryTabContext.Provider value={ctx}>
      {cached.map(([id, node]) => {
        const isCommittedActive = activeTab === id
        const isPeek = peekTab === id
        const painted = isCommittedActive || isPeek
        return (
          <Activity key={id} mode={painted ? 'visible' : 'hidden'}>
            <div
              ref={(nodeEl) => {
                paneElsRef.current.set(id, nodeEl)
              }}
              data-margo-primary-tab={id}
              data-margo-primary-tab-active={isCommittedActive ? '1' : '0'}
              data-margo-primary-tab-peek={isPeek ? '1' : '0'}
              aria-hidden={!isCommittedActive}
              style={paneStyle(painted, isCommittedActive)}
            >
              {node}
            </div>
          </Activity>
        )
      })}

      {activeTab === null ? children : null}
    </PrimaryTabContext.Provider>
  )
}

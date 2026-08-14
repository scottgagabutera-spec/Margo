'use client'

import {
  Activity,
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePrimaryTabSwipeGesture } from '@/hooks/usePrimaryTabSwipeGesture'
import { PrimaryTabPaneSkeleton } from '@/components/margo-skeletons'
import { warmPrimaryTab } from '@/lib/primary-tab-prefetch'

/**
 * Phase 1 / 1.5 / 2.0 / optimistic tap — primary-tab keepalive + Activity + swipe strip.
 *
 * Each pane (feed | discover | compose | you) is its own overflow container.
 * Visited panes stay mounted; inactive panes use <Activity mode="hidden">
 * so Effects tear down while React state is preserved.
 *
 * Tab taps: if the pane is cached, paint it immediately and router.push in
 * the background. Do not wait for RSC. Uncached destinations show a skeleton
 * until the route commits, then seed the cache (never from a loading fallback).
 *
 * Peek still does not flip isTabActive (Realtime stays off until the painted
 * destination is the active tab, including optimistic).
 */

export type PrimaryTabId = 'feed' | 'discover' | 'compose' | 'you'
export type PrimaryTabPeekDir = 'prev' | 'next'

const SCROLL_STORAGE_KEY = 'margo-primary-tab-scroll'

export function resolvePrimaryTabId(
  pathname: string | null,
  ownProfileHref: string | null
): PrimaryTabId | null {
  if (!pathname) return null
  const path = pathname.split('?')[0]
  if (path === '/feed') return 'feed'
  if (path === '/discover') return 'discover'
  if (path === '/compose') return 'compose'
  if (ownProfileHref && path === ownProfileHref) return 'you'
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

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

interface PrimaryTabContextValue {
  activeTab: PrimaryTabId | null
  peekTab: PrimaryTabId | null
  isOnPrimaryTab: boolean
  /** True for the painted destination (optimistic or committed) — never peek-only. */
  isTabActive: (id: PrimaryTabId) => boolean
  hasCachedTab: (id: PrimaryTabId) => boolean
  navigatePrimaryTab: (href: string, event?: MouseEvent<HTMLAnchorElement>) => boolean
  beginPeek: (id: PrimaryTabId, dir: PrimaryTabPeekDir) => boolean
  setStripOffset: (px: number) => void
  endPeek: () => void
}

const PrimaryTabContext = createContext<PrimaryTabContextValue>({
  activeTab: null,
  peekTab: null,
  isTabActive: () => false,
  isOnPrimaryTab: false,
  hasCachedTab: () => false,
  navigatePrimaryTab: () => false,
  beginPeek: () => false,
  setStripOffset: () => {},
  endPeek: () => {},
})

export function usePrimaryTab() {
  return useContext(PrimaryTabContext)
}

/** Warm + optimistic navigate for primary-tab <Link>s (mobile bar + desktop nav). */
export function usePrimaryTabLinkProps(href: string) {
  const { navigatePrimaryTab } = usePrimaryTab()
  const warm = () => warmPrimaryTab(href)
  return {
    onPointerEnter: warm,
    onPointerDown: warm,
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      navigatePrimaryTab(href, e)
    },
  }
}

interface PrimaryTabShellProps {
  children: ReactNode
  ownProfileHref: string | null
  enableSwipeGesture?: boolean
  /** Nav / tab bar — must sit inside this provider for optimistic clicks. */
  chrome?: ReactNode
}

const paneStyle = (painted: boolean, isCommittedActive: boolean): CSSProperties => ({
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',
  overflowAnchor: 'none',
  boxSizing: 'border-box',
  touchAction: 'pan-y',
  pointerEvents: isCommittedActive ? 'auto' : 'none',
  zIndex: isCommittedActive ? 2 : painted ? 1 : 0,
})

export function PrimaryTabShell({
  children,
  ownProfileHref,
  enableSwipeGesture = false,
  chrome,
}: PrimaryTabShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const routeTab = resolvePrimaryTabId(pathname, ownProfileHref)
  const [optimisticTab, setOptimisticTab] = useState<PrimaryTabId | null>(null)
  const activeTab = optimisticTab ?? routeTab

  const cacheRef = useRef(new Map<PrimaryTabId, ReactNode>())
  const paneElsRef = useRef(new Map<PrimaryTabId, HTMLElement | null>())
  const prevTabRef = useRef<PrimaryTabId | null>(null)
  const frozenScrollRef = useRef<Partial<Record<PrimaryTabId, number>>>({})
  const activeTabRef = useRef<PrimaryTabId | null>(activeTab)
  const peekMetaRef = useRef<{ id: PrimaryTabId; dir: PrimaryTabPeekDir } | null>(null)
  const stripOffsetRef = useRef(0)
  const [, setCacheVersion] = useState(0)
  const [peekTab, setPeekTabState] = useState<PrimaryTabId | null>(null)

  activeTabRef.current = activeTab

  // Seed cache only after the App Router has committed this tab, so we never
  // freeze a loading fallback as the keepalive tree.
  if (routeTab && !cacheRef.current.has(routeTab)) {
    cacheRef.current.set(routeTab, children)
  }

  useLayoutEffect(() => {
    if (optimisticTab && routeTab === optimisticTab) {
      setOptimisticTab(null)
    }
  }, [routeTab, optimisticTab])

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

  const navigatePrimaryTab = useCallback((href: string, event?: MouseEvent<HTMLAnchorElement>) => {
    if (event && isModifiedClick(event)) return false
    const path = href.split('?')[0]
    const id = resolvePrimaryTabId(path, ownProfileHref)
    if (!id) return false
    event?.preventDefault()
    if (id === 'compose' && href.includes('?')) {
      cacheRef.current.delete('compose')
      setCacheVersion(v => v + 1)
    }
    if (id === activeTabRef.current && routeTab === id && !href.includes('?')) {
      return true
    }
    endPeek()
    setOptimisticTab(id)
    startTransition(() => {
      router.push(href)
    })
    return true
  }, [ownProfileHref, routeTab, router, endPeek])

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

  useLayoutEffect(() => {
    const prev = prevTabRef.current
    const frozen = frozenScrollRef.current

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

    for (const el of paneElsRef.current.values()) {
      if (!el) continue
      el.style.transform = ''
      el.style.willChange = ''
    }

    prevTabRef.current = activeTab
  }, [activeTab, pathname])

  useLayoutEffect(() => {
    if (!peekTab) return
    const el = paneElsRef.current.get(peekTab)
    if (!el) return
    const y = frozenScrollRef.current[peekTab] ?? readStoredScrollMap()[peekTab] ?? 0
    if (Math.abs(el.scrollTop - y) > 1) el.scrollTop = y
    applyStripTransforms()
  }, [peekTab, applyStripTransforms])

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
      navigatePrimaryTab,
      beginPeek,
      setStripOffset,
      endPeek,
    }),
    [activeTab, peekTab, hasCachedTab, navigatePrimaryTab, beginPeek, setStripOffset, endPeek]
  )

  usePrimaryTabSwipeGesture(enableSwipeGesture, ownProfileHref, {
    beginPeek,
    setStripOffset,
    endPeek,
    hasCachedTab,
    prepareTab: (id) => {
      setOptimisticTab(id)
    },
  })

  const cached = [...cacheRef.current.entries()]
  const showSkeleton = !!activeTab && !cacheRef.current.has(activeTab)

  return (
    <PrimaryTabContext.Provider value={ctx}>
      {chrome}
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

      {showSkeleton && activeTab && (
        <div
          data-margo-primary-tab-skeleton={activeTab}
          style={paneStyle(true, true)}
        >
          <PrimaryTabPaneSkeleton tab={activeTab} />
        </div>
      )}

      {activeTab === null ? children : null}
    </PrimaryTabContext.Provider>
  )
}

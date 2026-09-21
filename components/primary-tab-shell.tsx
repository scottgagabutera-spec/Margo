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
  type PointerEvent,
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
const FEED_RESUME_KEY = 'margo-feed-resume'
const FEED_RESUME_MAX_MS = 12 * 60 * 60 * 1000

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

function readFeedResume(): { y: number; anchorId?: string | null } | undefined {
  try {
    const raw = localStorage.getItem(FEED_RESUME_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { y?: number; at?: number; anchorId?: string | null }
    if (typeof parsed.y !== 'number' || typeof parsed.at !== 'number') return undefined
    if (Date.now() - parsed.at > FEED_RESUME_MAX_MS) return undefined
    return { y: parsed.y, anchorId: parsed.anchorId ?? null }
  } catch {
    return undefined
  }
}

function writeFeedResume(y: number, anchorId?: string | null) {
  try {
    localStorage.setItem(FEED_RESUME_KEY, JSON.stringify({ y, anchorId: anchorId || null, at: Date.now() }))
  } catch {
    /* private mode */
  }
}

function findFeedAnchorId(pane: HTMLElement): string | null {
  const paneTop = pane.getBoundingClientRect().top
  const nodes = pane.querySelectorAll('[id^="feed-post-"]')
  for (const node of nodes) {
    const r = node.getBoundingClientRect()
    if (r.bottom > paneTop + 72) {
      return node.id.slice('feed-post-'.length)
    }
  }
  return null
}

function readStoredScrollMap(): Partial<Record<PrimaryTabId, number>> {
  let map: Partial<Record<PrimaryTabId, number>> = {}
  try {
    const raw = sessionStorage.getItem(SCROLL_STORAGE_KEY)
    if (raw) map = JSON.parse(raw) as Partial<Record<PrimaryTabId, number>>
  } catch {
    map = {}
  }
  if (map.feed == null) {
    const resume = readFeedResume()
    if (resume) map.feed = resume.y
  }
  return map
}

function writeStoredScrollMap(map: Partial<Record<PrimaryTabId, number>>) {
  try {
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* private mode */
  }
}

let frozenScrollLive: Partial<Record<PrimaryTabId, number>> = {}

function persistScroll(
  frozen: Partial<Record<PrimaryTabId, number>>,
  id: PrimaryTabId,
  y: number,
  anchorId?: string | null,
) {
  if (id === 'feed') {
    const prev = readFeedResume()
    const nextAnchor = anchorId === undefined ? (prev?.anchorId ?? null) : anchorId
    // Skeleton / hidden pane often reports y=0 with no post nodes.
    // Do not clobber a real resume. Explicit clear passes anchorId null.
    const keepResume = y < 1 && anchorId === undefined && !!prev && (prev.y >= 1 || !!prev.anchorId)
    if (keepResume) {
      frozen[id] = prev.y
      frozenScrollLive = frozen
      const map = readStoredScrollMap()
      map[id] = prev.y
      writeStoredScrollMap(map)
      return
    }
    frozen[id] = y
    frozenScrollLive = frozen
    const map = readStoredScrollMap()
    map[id] = y
    writeStoredScrollMap(map)
    writeFeedResume(y, nextAnchor)
    return
  }

  frozen[id] = y
  frozenScrollLive = frozen
  const map = readStoredScrollMap()
  map[id] = y
  writeStoredScrollMap(map)
}

function feedAnchorFromPane(el: HTMLElement): string | undefined {
  return findFeedAnchorId(el) || undefined
}

/** Snapshot the active pane before navigating to a post / other screen. */
export function persistActivePrimaryScroll() {
  const el = getActivePrimaryScrollEl()
  if (!el) return
  const id = el.getAttribute('data-margo-primary-tab') as PrimaryTabId | null
  if (!id) return
  persistScroll(
    frozenScrollLive,
    id,
    el.scrollTop,
    id === 'feed' ? feedAnchorFromPane(el) : undefined,
  )
}

/** After posting, land at the top of Feed — not the previous mid-scroll. */
export function clearPrimaryTabScroll(id: PrimaryTabId) {
  persistScroll(frozenScrollLive, id, 0, null)
}

export type PrimaryScrollRestore = {
  applied: boolean
  anchored: boolean
  waitingForAnchor: boolean
}

const SCROLL_RESTORE_NONE: PrimaryScrollRestore = {
  applied: false,
  anchored: false,
  waitingForAnchor: false,
}

/** Re-apply stored pane scroll after list content remounts (skeleton → posts). */
export function restoreActivePrimaryScroll(): PrimaryScrollRestore {
  const el = getActivePrimaryScrollEl()
  if (!el) return SCROLL_RESTORE_NONE
  const id = el.getAttribute('data-margo-primary-tab') as PrimaryTabId | null
  if (!id) return SCROLL_RESTORE_NONE
  if (id === 'feed') {
    const resume = readFeedResume()
    if (resume?.anchorId) {
      const node = document.getElementById('feed-post-' + resume.anchorId)
      if (node && el.contains(node)) {
        const delta = node.getBoundingClientRect().top - el.getBoundingClientRect().top
        el.scrollTop += delta
        return { applied: true, anchored: true, waitingForAnchor: false }
      }
      if (resume.y >= 1) el.scrollTop = resume.y
      return { applied: resume.y >= 1, anchored: false, waitingForAnchor: true }
    }
    if (resume && resume.y >= 1) {
      el.scrollTop = resume.y
      return { applied: true, anchored: false, waitingForAnchor: false }
    }
  }
  const target = frozenScrollLive[id] ?? readStoredScrollMap()[id]
  if (target == null || target < 1) return SCROLL_RESTORE_NONE
  if (Math.abs(el.scrollTop - target) > 1) {
    el.scrollTop = target
  }
  return { applied: true, anchored: false, waitingForAnchor: false }
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
}

/** Gold flash so a tap always paints, even when the route commit is instant. */
const TAB_ACK_MS = 160
/** Spinner only if the destination is still in-flight after this delay. */
const TAB_RING_DELAY_MS = 90

interface PrimaryTabContextValue {
  activeTab: PrimaryTabId | null
  peekTab: PrimaryTabId | null
  pendingTab: PrimaryTabId | null
  isOnPrimaryTab: boolean
  /** True for the painted destination (optimistic or committed) — never peek-only. */
  isTabActive: (id: PrimaryTabId) => boolean
  /** True while the tap is acknowledged (gold), including instant cached switches. */
  isTabAcked: (id: PrimaryTabId) => boolean
  /** True while in-flight long enough to show a spinner — not a 1-frame flicker. */
  isTabPending: (id: PrimaryTabId) => boolean
  hasCachedTab: (id: PrimaryTabId) => boolean
  acknowledgePrimaryTab: (id: PrimaryTabId) => void
  navigatePrimaryTab: (href: string, event?: MouseEvent<HTMLAnchorElement>) => boolean
  beginPeek: (id: PrimaryTabId, dir: PrimaryTabPeekDir) => boolean
  setStripOffset: (px: number) => void
  endPeek: () => void
}

const PrimaryTabContext = createContext<PrimaryTabContextValue>({
  activeTab: null,
  peekTab: null,
  pendingTab: null,
  isTabActive: () => false,
  isTabAcked: () => false,
  isTabPending: () => false,
  isOnPrimaryTab: false,
  hasCachedTab: () => false,
  acknowledgePrimaryTab: () => {},
  navigatePrimaryTab: () => false,
  beginPeek: () => false,
  setStripOffset: () => {},
  endPeek: () => {},
})

export function usePrimaryTab() {
  return useContext(PrimaryTabContext)
}

/** Warm + optimistic navigate for primary-tab <Link>s (mobile bar + desktop nav). */
export function usePrimaryTabLinkProps(href: string, tabId?: PrimaryTabId) {
  const { navigatePrimaryTab, acknowledgePrimaryTab, isTabPending, isTabAcked } = usePrimaryTab()
  const pending = !!tabId && isTabPending(tabId)
  const acked = !!tabId && isTabAcked(tabId)
  const warm = () => warmPrimaryTab(href)
  return {
    onPointerEnter: warm,
    onPointerDown: (event: PointerEvent<HTMLAnchorElement>) => {
      warm()
      if (!tabId) return
      if (event.button !== 0 && event.pointerType === 'mouse') return
      acknowledgePrimaryTab(tabId)
    },
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      navigatePrimaryTab(href, e)
    },
    'aria-busy': pending || acked || undefined,
  }
}

interface PrimaryTabShellProps {
  children: ReactNode
  ownProfileHref: string | null
  enableSwipeGesture?: boolean
  /** Nav / tab bar — must sit inside this provider for optimistic clicks. */
  chrome?: ReactNode
}

/** Hub overlay listens for this so it closes in the same turn as a tab paint. */
export const MARGO_CLOSE_HUB_EVENT = 'margo:close-hub'

function closeHubOverlay() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(MARGO_CLOSE_HUB_EVENT))
}

const paneStyle = (
  painted: boolean,
  isCommittedActive: boolean,
  show: boolean,
): CSSProperties => ({
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  overscrollBehaviorY: 'contain',
  overflowAnchor: 'none',
  boxSizing: 'border-box',
  touchAction: 'pan-y',
  background: 'var(--bg)',
  pointerEvents: isCommittedActive ? 'auto' : 'none',
  zIndex: isCommittedActive ? 2 : painted ? 1 : 0,
  // Hide the pane element itself. Activity mode="hidden" is not enough:
  // these nodes are position:fixed, and WebKit can still paint them through
  // a hidden ancestor. Never unhide every cached pane just because we
  // entered a primary surface — that is what flashed Feed under You.
  visibility: show ? 'visible' : 'hidden',
  opacity: show ? 1 : 0,
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
  const [ackedTab, setAckedTab] = useState<PrimaryTabId | null>(null)
  const [ringTab, setRingTab] = useState<PrimaryTabId | null>(null)
  const optimisticTabRef = useRef<PrimaryTabId | null>(null)
  const ackClearRef = useRef<number | null>(null)
  const activeTab = optimisticTab ?? routeTab
  optimisticTabRef.current = optimisticTab

  const cacheRef = useRef(new Map<PrimaryTabId, ReactNode>())
  const paneElsRef = useRef(new Map<PrimaryTabId, HTMLElement | null>())
  const prevTabRef = useRef<PrimaryTabId | null>(null)
  const frozenScrollRef = useRef(frozenScrollLive)
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

  const acknowledgePrimaryTab = useCallback((id: PrimaryTabId) => {
    setAckedTab(id)
    if (ackClearRef.current != null) window.clearTimeout(ackClearRef.current)
    ackClearRef.current = window.setTimeout(() => {
      setAckedTab((curr) => (curr === id ? null : curr))
      ackClearRef.current = null
    }, TAB_ACK_MS)
  }, [])

  useEffect(() => {
    if (!optimisticTab) {
      setRingTab(null)
      return
    }
    const id = optimisticTab
    const t = window.setTimeout(() => {
      if (optimisticTabRef.current === id) setRingTab(id)
    }, TAB_RING_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [optimisticTab])

  const navigatePrimaryTab = useCallback((href: string, event?: MouseEvent<HTMLAnchorElement>) => {
    if (event && isModifiedClick(event)) return false
    const path = href.split('?')[0]
    const id = resolvePrimaryTabId(path, ownProfileHref)
    if (!id) return false
    event?.preventDefault()
    closeHubOverlay()
    const pending = optimisticTab
    if (pending && pending !== id) return true
    acknowledgePrimaryTab(id)
    if (id === 'compose' && href.includes('?')) {
      cacheRef.current.delete('compose')
      setCacheVersion(v => v + 1)
    }
    if (id === activeTabRef.current && routeTab === id && !href.includes('?')) {
      const y = readActiveScrollTop()
      if (y > 24) {
        scrollActiveTo(0, 'smooth')
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('margo:primary-tab-reselect', { detail: { id } }))
      }
      return true
    }
    endPeek()
    setOptimisticTab(id)
    startTransition(() => {
      router.push(href)
    })
    return true
  }, [ownProfileHref, routeTab, router, endPeek, optimisticTab, acknowledgePrimaryTab])

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
      persistScroll(
        frozen,
        prev,
        y,
        prev === 'feed' && el && live > 0 ? feedAnchorFromPane(el) : undefined,
      )
      if (el && Math.abs(el.scrollTop - y) > 1) {
        el.scrollTop = y
      }
    }

    if (activeTab) {
      const el = paneElsRef.current.get(activeTab)
      if (el) {
        if (activeTab === 'feed') {
          restoreActivePrimaryScroll()
          frozen[activeTab] = el.scrollTop
          requestAnimationFrame(() => {
            restoreActivePrimaryScroll()
          })
        } else {
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
      }
      window.scrollTo(0, 0) // reset document scroll; primary panes are position:fixed
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
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || Number(cs.opacity) === 0) return
      persistScroll(
        frozenScrollRef.current,
        tabId,
        el.scrollTop,
        tabId === 'feed' ? feedAnchorFromPane(el) : undefined,
      )
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [activeTab, pathname])

  useEffect(() => {
    const persistVisible = () => {
      for (const [id, pane] of paneElsRef.current) {
        if (!pane) continue
        const cs = getComputedStyle(pane)
        if (cs.display === 'none' || Number(cs.opacity) === 0) continue
        persistScroll(
          frozenScrollRef.current,
          id,
          pane.scrollTop,
          id === 'feed' ? feedAnchorFromPane(pane) : undefined,
        )
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistVisible()
    }
    window.addEventListener('pagehide', persistVisible)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', persistVisible)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const ctx = useMemo<PrimaryTabContextValue>(
    () => ({
      activeTab,
      peekTab,
      pendingTab: optimisticTab,
      isOnPrimaryTab: activeTab !== null,
      isTabActive: (id: PrimaryTabId) => activeTab === id,
      isTabAcked: (id: PrimaryTabId) => ackedTab === id,
      isTabPending: (id: PrimaryTabId) => ringTab === id,
      hasCachedTab,
      acknowledgePrimaryTab,
      navigatePrimaryTab,
      beginPeek,
      setStripOffset,
      endPeek,
    }),
    [activeTab, peekTab, optimisticTab, ackedTab, ringTab, hasCachedTab, acknowledgePrimaryTab, navigatePrimaryTab, beginPeek, setStripOffset, endPeek]
  )

  usePrimaryTabSwipeGesture(enableSwipeGesture, ownProfileHref, {
    beginPeek,
    setStripOffset,
    endPeek,
    hasCachedTab,
    prepareTab: (id) => {
      closeHubOverlay()
      setOptimisticTab(id)
    },
  })

  const cached = [...cacheRef.current.entries()]
  const showSkeleton = !!activeTab && !cacheRef.current.has(activeTab)
  const onPrimarySurface = routeTab !== null || optimisticTab !== null

  return (
    <PrimaryTabContext.Provider value={ctx}>
      {chrome}
      {cached.map(([id, node]) => {
        const isCommittedActive = activeTab === id
        const isPeek = peekTab === id
        const painted = isCommittedActive || isPeek
        const show = painted && onPrimarySurface
        return (
          <Activity key={id} mode={painted ? 'visible' : 'hidden'}>
            <div
              ref={(nodeEl) => {
                paneElsRef.current.set(id, nodeEl)
              }}
              data-margo-primary-tab={id}
              data-margo-primary-tab-active={isCommittedActive ? '1' : '0'}
              data-margo-primary-tab-peek={isPeek ? '1' : '0'}
              data-margo-primary-tab-shown={show ? '1' : '0'}
              hidden={!show}
              aria-hidden={!isCommittedActive}
              style={paneStyle(painted, isCommittedActive, show)}
            >
              {node}
            </div>
          </Activity>
        )
      })}

      {showSkeleton && activeTab && (
        <div
          data-margo-primary-tab-skeleton={activeTab}
          style={paneStyle(true, true, true)}
        >
          <PrimaryTabPaneSkeleton tab={activeTab} />
        </div>
      )}

      {activeTab === null ? children : null}
    </PrimaryTabContext.Provider>
  )
}

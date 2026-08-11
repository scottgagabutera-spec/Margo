'use client'

/**
 * Phase 2.0 — hand-rolled primary-tab swipe (Pointer Events + transform strip).
 *
 * Static `touch-action: pan-y` on the viewport/panes (globals.css) reserves
 * horizontal for JS from the first sample. AXIS_SLOP_PX only decides whether
 * *this app* claims a horizontal tab gesture vs letting vertical scroll/PTR
 * continue — it must not be the mechanism that fights the browser for the
 * pointer stream (Phase A's preventDefault-after-lock gap).
 */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  resolvePrimaryTabId,
  type PrimaryTabId,
  type PrimaryTabPeekDir,
} from '@/components/primary-tab-shell'

const EDGE_ZONE_PX = 24
const AXIS_SLOP_PX = 10
const SWIPE_DISTANCE_PX = 72
const SWIPE_VELOCITY_PX_MS = 0.45
const MOBILE_MQ = '(max-width: 639px)'
const STORAGE_KEY = 'margo-tab-swipe-dir'

export const TAB_SWIPE_EXCLUDE_SELECTOR = [
  '.row-scroll',
  '.mp-bar',
  '.mp-sheet',
  '.margo-mp-scrim',
  '.margo-preview-scrim',
  '.margo-seek-scrub',
  '[data-margo-swipe-exclude]',
].join(',')

function isExcludedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true
  return Boolean(target.closest(TAB_SWIPE_EXCLUDE_SELECTOR))
}

/** Ordered swipe chain — Compose and /signin are never included. */
export function buildTabSwipeChain(ownProfileHref: string | null): string[] {
  const tabs = ['/feed', '/discover', '/notifications']
  if (ownProfileHref) tabs.push(ownProfileHref)
  return tabs
}

/** Active only on exact allowlisted paths (not /discover/songs, not /signin). */
export function isTabSwipePath(pathname: string | null, ownProfileHref: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/feed' || pathname === '/discover' || pathname === '/notifications') return true
  if (ownProfileHref && pathname === ownProfileHref) return true
  return false
}

function hrefToTabId(href: string, ownProfileHref: string | null): PrimaryTabId | null {
  return resolvePrimaryTabId(href, ownProfileHref)
}

export type PrimaryTabSwipeApi = {
  beginPeek: (id: PrimaryTabId, dir: PrimaryTabPeekDir) => boolean
  setStripOffset: (px: number) => void
  endPeek: () => void
  hasCachedTab: (id: PrimaryTabId) => boolean
}

/** Call from inside PrimaryTabShell after peek/strip APIs exist. */
export function usePrimaryTabSwipeGesture(
  enabled: boolean,
  ownProfileHref: string | null,
  api: PrimaryTabSwipeApi
) {
  const pathname = usePathname()
  const router = useRouter()
  const { beginPeek, setStripOffset, endPeek, hasCachedTab } = api

  useEffect(() => {
    if (!enabled) return

    type Axis = null | 'h' | 'v'
    const tracking = {
      pointerId: -1,
      armed: false,
      following: false,
      startX: 0,
      startY: 0,
      axis: null as Axis,
      lastX: 0,
      peekHref: null as string | null,
      samples: [] as { t: number; x: number }[],
    }

    const reset = () => {
      tracking.pointerId = -1
      tracking.armed = false
      tracking.following = false
      tracking.axis = null
      tracking.peekHref = null
      tracking.samples = []
    }

    const pushSample = (x: number, t: number) => {
      tracking.samples.push({ x, t })
      while (tracking.samples.length > 6) tracking.samples.shift()
    }

    const recentVelocity = () => {
      if (tracking.samples.length < 2) return 0
      const last = tracking.samples[tracking.samples.length - 1]
      let i = tracking.samples.length - 2
      while (i > 0 && last.t - tracking.samples[i].t < 80) i--
      const first = tracking.samples[i]
      const dt = Math.max(1, last.t - first.t)
      return (last.x - first.x) / dt
    }

    const onPointerDown = (e: PointerEvent) => {
      reset()
      if (!window.matchMedia(MOBILE_MQ).matches) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!isTabSwipePath(pathname, ownProfileHref)) return
      if (e.isPrimary === false) return

      const w = window.innerWidth
      if (e.clientX < EDGE_ZONE_PX || e.clientX > w - EDGE_ZONE_PX) return
      if (isExcludedTarget(e.target)) return

      tracking.pointerId = e.pointerId
      tracking.armed = true
      tracking.startX = e.clientX
      tracking.startY = e.clientY
      tracking.lastX = e.clientX
      tracking.axis = null
      pushSample(e.clientX, performance.now())
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!tracking.armed || e.pointerId !== tracking.pointerId) return
      if (tracking.axis === 'v') return

      const dx = e.clientX - tracking.startX
      const dy = e.clientY - tracking.startY
      tracking.lastX = e.clientX
      pushSample(e.clientX, performance.now())

      if (tracking.axis === null) {
        if (Math.abs(dx) < AXIS_SLOP_PX && Math.abs(dy) < AXIS_SLOP_PX) return
        if (Math.abs(dy) >= Math.abs(dx)) {
          tracking.axis = 'v'
          tracking.armed = false
          return
        }
        tracking.axis = 'h'

        if (e.target instanceof Element) {
          try {
            e.target.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
        }

        const tabs = buildTabSwipeChain(ownProfileHref)
        if (!pathname) return
        const idx = tabs.indexOf(pathname)
        if (idx < 0) return
        const nextIdx = dx < 0 ? idx + 1 : idx - 1
        if (nextIdx < 0 || nextIdx >= tabs.length) {
          tracking.following = true
          tracking.peekHref = null
          setStripOffset(dx * 0.25)
          return
        }
        const href = tabs[nextIdx]
        const tabId = hrefToTabId(href, ownProfileHref)
        const dir: PrimaryTabPeekDir = dx < 0 ? 'next' : 'prev'
        if (tabId && hasCachedTab(tabId) && beginPeek(tabId, dir)) {
          tracking.peekHref = href
          tracking.following = true
          setStripOffset(dx)
        } else {
          tracking.following = false
          tracking.peekHref = href
        }
        return
      }

      if (tracking.axis === 'h' && tracking.following) {
        if (!tracking.peekHref) {
          setStripOffset(dx * 0.25)
        } else {
          const dirNext = dx < 0
          const toward =
            (dirNext && dx <= 0) || (!dirNext && dx >= 0) ? dx : dx * 0.25
          setStripOffset(toward)
        }
      }
    }

    const finish = (e: PointerEvent) => {
      if (e.pointerId !== tracking.pointerId) return
      if (!tracking.armed) {
        reset()
        return
      }

      if (tracking.axis !== 'h') {
        endPeek()
        reset()
        return
      }

      const tabs = buildTabSwipeChain(ownProfileHref)
      if (!pathname || !isTabSwipePath(pathname, ownProfileHref)) {
        endPeek()
        reset()
        return
      }

      const dx = e.clientX - tracking.startX
      const vel = recentVelocity()
      const speed = Math.abs(vel)
      const peekHref = tracking.peekHref

      const distanceOk = Math.abs(dx) >= SWIPE_DISTANCE_PX
      const velocityOk =
        speed >= SWIPE_VELOCITY_PX_MS && Math.sign(vel) === Math.sign(dx || vel)
      const shouldCommit = distanceOk || velocityOk

      reset()

      if (!shouldCommit || !peekHref) {
        endPeek()
        return
      }

      if (tabs.indexOf(pathname) < 0 || tabs.indexOf(peekHref) < 0) {
        endPeek()
        return
      }

      try {
        sessionStorage.setItem(STORAGE_KEY, dx < 0 ? 'next' : 'prev')
      } catch {
        /* private mode */
      }
      router.push(peekHref)
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== tracking.pointerId) return
      endPeek()
      reset()
    }

    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', finish, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', onPointerCancel)
      endPeek()
    }
  }, [
    enabled,
    pathname,
    ownProfileHref,
    router,
    beginPeek,
    setStripOffset,
    endPeek,
    hasCachedTab,
  ])
}

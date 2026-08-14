'use client'

/**
 * Phase 2 — hand-rolled primary-tab swipe (Pointer Events + strip).
 *
 * Static `touch-action: pan-y` reserves horizontal for JS from the first sample.
 * AXIS_SLOP only decides app-level H vs V (scroll/PTR vs tab swipe).
 *
 * Settle: rAF spring (commit → ±W then router.push; cancel/edge → 0 then endPeek).
 * Interruptible mid-settle; edge rubber-band never navigates.
 * Tab-bar taps are handled by PrimaryTabShell.navigatePrimaryTab (optimistic
 * paint). This hook only owns swipe strip physics. Compose is tap-only.
 */

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  resolvePrimaryTabId,
  type PrimaryTabId,
  type PrimaryTabPeekDir,
} from '@/components/primary-tab-shell'
import { rubberBandOffset, stepSpring } from '@/lib/tab-swipe-motion'

const EDGE_ZONE_PX = 24
const AXIS_SLOP_PX = 10
const SWIPE_DISTANCE_PX = 72
const SWIPE_VELOCITY_PX_MS = 0.45
const SETTLE_MAX_MS = 900
const MOBILE_MQ = '(max-width: 639px)'

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

/** Ordered swipe chain — Compose and /signin are never included. Notifications live in Hub. */
export function buildTabSwipeChain(ownProfileHref: string | null): string[] {
  const tabs = ['/feed', '/discover']
  if (ownProfileHref) tabs.push(ownProfileHref)
  return tabs
}

/** Active only on exact allowlisted paths (not /discover/songs, not /signin). */
export function isTabSwipePath(pathname: string | null, ownProfileHref: string | null): boolean {
  if (!pathname) return false
  if (pathname === '/feed' || pathname === '/discover') return true
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
  /** Paint destination before router.push so swipe-commit is not RSC-blocked. */
  prepareTab: (id: PrimaryTabId) => void
}

/** Call from inside PrimaryTabShell after peek/strip APIs exist. */
export function usePrimaryTabSwipeGesture(
  enabled: boolean,
  ownProfileHref: string | null,
  api: PrimaryTabSwipeApi
) {
  const pathname = usePathname()
  const router = useRouter()
  const { beginPeek, setStripOffset, endPeek, hasCachedTab, prepareTab } = api

  useEffect(() => {
    if (!enabled) return

    type Axis = null | 'h' | 'v'
    type Phase = 'idle' | 'dragging' | 'settling'

    const tracking = {
      phase: 'idle' as Phase,
      pointerId: -1,
      armed: false,
      following: false,
      startX: 0,
      startY: 0,
      axis: null as Axis,
      lastX: 0,
      offset: 0,
      peekHref: null as string | null,
      peekDir: null as PrimaryTabPeekDir | null,
      samples: [] as { t: number; x: number }[],
    }

    let raf = 0
    let settleVelocity = 0
    let settleTarget = 0
    let settleStartedAt = 0
    let settleOnComplete: (() => void) | null = null
    let lastFrameT = 0

    const applyOffset = (px: number) => {
      tracking.offset = px
      setStripOffset(px)
    }

    const stopSettleRaf = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      settleOnComplete = null
    }

    /** Cancel in-flight spring without running its completion (interrupt). */
    const interruptSettle = () => {
      stopSettleRaf()
      tracking.phase = 'idle'
    }

    const resetDrag = () => {
      tracking.pointerId = -1
      tracking.armed = false
      tracking.following = false
      tracking.axis = null
      tracking.samples = []
      // Keep peekHref / peekDir / offset while settling or after interrupt reattach.
    }

    const hardIdle = () => {
      interruptSettle()
      tracking.phase = 'idle'
      tracking.peekHref = null
      tracking.peekDir = null
      tracking.offset = 0
      resetDrag()
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

    const startSettle = (target: number, velocity: number, onComplete: () => void) => {
      stopSettleRaf()

      // Reduced motion — jump to target; still run completion (route / endPeek).
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        applyOffset(target)
        tracking.phase = 'idle'
        onComplete()
        return
      }

      tracking.phase = 'settling'
      settleTarget = target
      settleVelocity = velocity
      settleOnComplete = onComplete
      settleStartedAt = performance.now()
      lastFrameT = settleStartedAt

      const tick = (now: number) => {
        const dt = now - lastFrameT
        lastFrameT = now
        const next = stepSpring(
          { offset: tracking.offset, velocity: settleVelocity },
          settleTarget,
          dt
        )
        settleVelocity = next.velocity
        applyOffset(next.offset)

        const timedOut = now - settleStartedAt > SETTLE_MAX_MS
        if (next.done || timedOut) {
          applyOffset(settleTarget)
          raf = 0
          tracking.phase = 'idle'
          const cb = settleOnComplete
          settleOnComplete = null
          cb?.()
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    /** Mid-drag: same peek until offset crosses 0, then cancel and maybe opposite. */
    const updateFollowOffset = (dx: number) => {
      const w = window.innerWidth
      const tabs = buildTabSwipeChain(ownProfileHref)
      if (!pathname) {
        applyOffset(dx)
        return
      }
      const idx = tabs.indexOf(pathname)
      if (idx < 0) {
        applyOffset(dx)
        return
      }

      // Edge rubber-band (no neighbor in gesture direction).
      if (!tracking.peekHref) {
        applyOffset(rubberBandOffset(dx, w))
        return
      }

      // Crossed through 0 — cancel current peek; maybe start opposite (v1).
      if (tracking.peekDir === 'next' && dx > 0) {
        endPeek()
        tracking.peekHref = null
        tracking.peekDir = null
        applyOffset(0)
        const prevIdx = idx - 1
        if (prevIdx < 0) {
          applyOffset(rubberBandOffset(dx, w))
          return
        }
        const href = tabs[prevIdx]
        const tabId = hrefToTabId(href, ownProfileHref)
        if (tabId && hasCachedTab(tabId) && beginPeek(tabId, 'prev')) {
          tracking.peekHref = href
          tracking.peekDir = 'prev'
          applyOffset(dx)
        } else {
          applyOffset(rubberBandOffset(dx, w))
        }
        return
      }
      if (tracking.peekDir === 'prev' && dx < 0) {
        endPeek()
        tracking.peekHref = null
        tracking.peekDir = null
        applyOffset(0)
        const nextIdx = idx + 1
        if (nextIdx >= tabs.length) {
          applyOffset(rubberBandOffset(dx, w))
          return
        }
        const href = tabs[nextIdx]
        const tabId = hrefToTabId(href, ownProfileHref)
        if (tabId && hasCachedTab(tabId) && beginPeek(tabId, 'next')) {
          tracking.peekHref = href
          tracking.peekDir = 'next'
          applyOffset(dx)
        } else {
          applyOffset(rubberBandOffset(dx, w))
        }
        return
      }

      // Same-direction resistance when pulling back toward 0 but not past it.
      applyOffset(dx)
    }

    const armHorizontal = (dx: number, e: PointerEvent) => {
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
      const w = window.innerWidth

      if (nextIdx < 0 || nextIdx >= tabs.length) {
        tracking.following = true
        tracking.peekHref = null
        tracking.peekDir = null
        applyOffset(rubberBandOffset(dx, w))
        return
      }

      const href = tabs[nextIdx]
      const tabId = hrefToTabId(href, ownProfileHref)
      const dir: PrimaryTabPeekDir = dx < 0 ? 'next' : 'prev'
      if (tabId && hasCachedTab(tabId) && beginPeek(tabId, dir)) {
        tracking.peekHref = href
        tracking.peekDir = dir
        tracking.following = true
        applyOffset(dx)
      } else {
        // Cold neighbor — commit-only on release (no paint / no spring strip).
        tracking.following = false
        tracking.peekHref = href
        tracking.peekDir = dir
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!window.matchMedia(MOBILE_MQ).matches) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (!isTabSwipePath(pathname, ownProfileHref)) return
      if (e.isPrimary === false) return

      const w = window.innerWidth
      if (e.clientX < EDGE_ZONE_PX || e.clientX > w - EDGE_ZONE_PX) return
      if (isExcludedTarget(e.target)) return

      // Interrupt settle — reclaim at current offset (no jump).
      if (tracking.phase === 'settling') {
        interruptSettle()
        tracking.phase = 'dragging'
        tracking.pointerId = e.pointerId
        tracking.armed = true
        tracking.following = true
        tracking.axis = 'h'
        tracking.startX = e.clientX - tracking.offset
        tracking.startY = e.clientY
        tracking.lastX = e.clientX
        tracking.samples = []
        pushSample(e.clientX, performance.now())
        if (e.target instanceof Element) {
          try {
            e.target.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
        }
        return
      }

      // Fresh drag — clear any leftover peek/strip from a prior gesture.
      endPeek()
      resetDrag()
      tracking.phase = 'dragging'
      tracking.pointerId = e.pointerId
      tracking.armed = true
      tracking.startX = e.clientX
      tracking.startY = e.clientY
      tracking.lastX = e.clientX
      tracking.axis = null
      tracking.offset = 0
      tracking.peekHref = null
      tracking.peekDir = null
      tracking.samples = []
      pushSample(e.clientX, performance.now())
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!tracking.armed || e.pointerId !== tracking.pointerId) return
      if (tracking.phase === 'settling') return
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
          tracking.phase = 'idle'
          return
        }
        tracking.axis = 'h'
        armHorizontal(dx, e)
        return
      }

      if (tracking.axis === 'h' && tracking.following) {
        updateFollowOffset(dx)
      }
    }

    const finish = (e: PointerEvent) => {
      if (e.pointerId !== tracking.pointerId) return
      if (tracking.phase === 'settling') return
      if (!tracking.armed) {
        resetDrag()
        return
      }

      if (tracking.axis !== 'h') {
        if (tracking.peekHref || tracking.offset !== 0) endPeek()
        hardIdle()
        return
      }

      if (!pathname || !isTabSwipePath(pathname, ownProfileHref)) {
        endPeek()
        hardIdle()
        return
      }

      const dx = e.clientX - tracking.startX
      const vel = recentVelocity()
      const speed = Math.abs(vel)
      const peekHref = tracking.peekHref
      const peekDir = tracking.peekDir
      const following = tracking.following
      const offsetNow = tracking.offset

      const distanceOk = Math.abs(dx) >= SWIPE_DISTANCE_PX || Math.abs(offsetNow) >= SWIPE_DISTANCE_PX
      const velocityOk =
        speed >= SWIPE_VELOCITY_PX_MS && Math.sign(vel) === Math.sign(dx || vel || offsetNow)
      const shouldCommit = Boolean(peekHref) && (distanceOk || velocityOk)

      resetDrag()

      const w = window.innerWidth

      // Cold neighbor: instant route, no strip spring.
      if (shouldCommit && peekHref && !following) {
        endPeek()
        tracking.phase = 'idle'
        tracking.peekHref = null
        tracking.peekDir = null
        tracking.offset = 0
        const tabId = hrefToTabId(peekHref, ownProfileHref)
        if (tabId) prepareTab(tabId)
        router.push(peekHref)
        return
      }

      if (shouldCommit && peekHref && peekDir && following) {
        const target = peekDir === 'next' ? -w : w
        startSettle(target, vel, () => {
          // Strip already at ±W; route swap clears peek synchronously in shell.
          tracking.peekHref = null
          tracking.peekDir = null
          const tabId = hrefToTabId(peekHref, ownProfileHref)
          if (tabId) prepareTab(tabId)
          router.push(peekHref)
        })
        return
      }

      // Cancel or edge — spring home, then drop peek paint.
      startSettle(0, vel, () => {
        endPeek()
        tracking.peekHref = null
        tracking.peekDir = null
        tracking.offset = 0
      })
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== tracking.pointerId) return
      interruptSettle()
      endPeek()
      hardIdle()
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
      interruptSettle()
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
    prepareTab,
  ])
}

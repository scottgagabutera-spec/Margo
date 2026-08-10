'use client'

import {
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { PrimaryTabShell } from '@/components/primary-tab-shell'

const EDGE_ZONE_PX = 24
const AXIS_SLOP_PX = 10
const SWIPE_DISTANCE_PX = 72
const SWIPE_VELOCITY_PX_MS = 0.45
const MOBILE_MQ = '(max-width: 639px)'
const STORAGE_KEY = 'margo-tab-swipe-dir'

/**
 * Phase A — touchstart inside any of these is never a tab-swipe.
 * Includes data-margo-swipe-exclude escape hatch for future UI.
 */
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

/**
 * Allowlisted layout-level tab swipe (Feed ↔ Discover ↔ Alerts ↔ You).
 * Mount once under IdentityProvider; wraps page {children} only.
 */
export function TabSwipeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, identity } = useIdentity()

  const isSignedIn = !!user && !user.isAnonymous
  const ownProfileHref =
    isSignedIn && identity?.username ? `/profile/${identity.username}` : null

  const [slideClass, setSlideClass] = useState('')

  useLayoutEffect(() => {
    try {
      const dir = sessionStorage.getItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      if (dir === 'next') setSlideClass('margo-tab-slide-from-right')
      else if (dir === 'prev') setSlideClass('margo-tab-slide-from-left')
      else setSlideClass('')
    } catch {
      setSlideClass('')
    }
  }, [pathname])

  useEffect(() => {
    type Axis = null | 'h' | 'v'
    const tracking = {
      armed: false,
      startX: 0,
      startY: 0,
      startT: 0,
      axis: null as Axis,
      lastX: 0,
    }

    const reset = () => {
      tracking.armed = false
      tracking.axis = null
    }

    const onTouchStart = (e: TouchEvent) => {
      reset()
      if (typeof window === 'undefined') return
      if (!window.matchMedia(MOBILE_MQ).matches) return
      if (!isTabSwipePath(pathname, ownProfileHref)) return
      if (e.touches.length !== 1) return

      const t = e.touches[0]
      const w = window.innerWidth
      if (t.clientX < EDGE_ZONE_PX || t.clientX > w - EDGE_ZONE_PX) return
      if (isExcludedTarget(e.target)) return

      tracking.armed = true
      tracking.startX = t.clientX
      tracking.startY = t.clientY
      tracking.lastX = t.clientX
      tracking.startT = Date.now()
      tracking.axis = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.armed || tracking.axis === 'v') return
      if (e.touches.length !== 1) return

      const t = e.touches[0]
      const dx = t.clientX - tracking.startX
      const dy = t.clientY - tracking.startY
      tracking.lastX = t.clientX

      if (tracking.axis === null) {
        if (Math.abs(dx) < AXIS_SLOP_PX && Math.abs(dy) < AXIS_SLOP_PX) return
        if (Math.abs(dy) >= Math.abs(dx)) {
          // Vertical wins — scroll / PTR owns the gesture
          tracking.axis = 'v'
          tracking.armed = false
          return
        }
        tracking.axis = 'h'
      }

      if (tracking.axis === 'h' && e.cancelable) {
        e.preventDefault()
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking.armed || tracking.axis !== 'h') {
        reset()
        return
      }

      const tabs = buildTabSwipeChain(ownProfileHref)
      if (!pathname || !isTabSwipePath(pathname, ownProfileHref)) {
        reset()
        return
      }

      const touch = e.changedTouches[0]
      const endX = touch ? touch.clientX : tracking.lastX
      const dx = endX - tracking.startX
      const dt = Math.max(1, Date.now() - tracking.startT)
      const velocity = Math.abs(dx) / dt
      reset()

      if (Math.abs(dx) < SWIPE_DISTANCE_PX && velocity < SWIPE_VELOCITY_PX_MS) return

      const idx = tabs.indexOf(pathname)
      if (idx < 0) return

      // Finger left → next tab; finger right → previous tab
      const nextIdx = dx < 0 ? idx + 1 : idx - 1
      if (nextIdx < 0 || nextIdx >= tabs.length) return

      const href = tabs[nextIdx]
      if (href === pathname) return

      try {
        sessionStorage.setItem(STORAGE_KEY, dx < 0 ? 'next' : 'prev')
      } catch {
        /* private mode */
      }
      router.push(href)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [pathname, ownProfileHref, router])

  return (
    <div
      className={slideClass || undefined}
      onAnimationEnd={() => setSlideClass('')}
      style={{ minHeight: '100%' }}
    >
      <PrimaryTabShell ownProfileHref={ownProfileHref}>
        {children}
      </PrimaryTabShell>
    </div>
  )
}

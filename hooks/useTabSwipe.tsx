'use client'

import {
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { PrimaryTabShell } from '@/components/primary-tab-shell'

export {
  TAB_SWIPE_EXCLUDE_SELECTOR,
  buildTabSwipeChain,
  isTabSwipePath,
} from '@/hooks/usePrimaryTabSwipeGesture'

/**
 * Layout wrapper for allowlisted primary-tab swipe.
 * Mount once under IdentityProvider; wraps page {children} only.
 *
 * Phase 2.0: viewport carries static `touch-action: pan-y`. Gesture logic
 * runs inside PrimaryTabShell (`enableSwipeGesture`) so peek/strip stay
 * collocated without wrapping keepalive `children` (which would poison cache).
 */
export function TabSwipeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, identity } = useIdentity()

  const isSignedIn = !!user && !user.isAnonymous
  const ownProfileHref =
    isSignedIn && identity?.username ? `/profile/${identity.username}` : null

  const [slideClass, setSlideClass] = useState('')

  useLayoutEffect(() => {
    try {
      const dir = sessionStorage.getItem('margo-tab-swipe-dir')
      sessionStorage.removeItem('margo-tab-swipe-dir')
      if (dir === 'next') setSlideClass('margo-tab-slide-from-right')
      else if (dir === 'prev') setSlideClass('margo-tab-slide-from-left')
      else setSlideClass('')
    } catch {
      setSlideClass('')
    }
  }, [pathname])

  return (
    <div
      className={'margo-tab-swipe-viewport' + (slideClass ? ' ' + slideClass : '')}
      onAnimationEnd={() => setSlideClass('')}
    >
      <PrimaryTabShell ownProfileHref={ownProfileHref} enableSwipeGesture>
        {children}
      </PrimaryTabShell>
    </div>
  )
}

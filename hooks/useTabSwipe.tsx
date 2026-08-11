'use client'

import { type ReactNode } from 'react'
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
 * Phase 2: viewport carries static `touch-action: pan-y`. Finger-follow +
 * interruptible spring settle run inside PrimaryTabShell (`enableSwipeGesture`).
 *
 * Tab-bar taps stay plain <Link> navigations (instant keepalive swap) — that is
 * intentional, not a missing animation. Swipe owns strip physics; taps own
 * discrete destination commits. CSS enter-slide was removed in Phase 2.3.
 */
export function TabSwipeProvider({ children }: { children: ReactNode }) {
  const { user, identity } = useIdentity()

  const isSignedIn = !!user && !user.isAnonymous
  const ownProfileHref =
    isSignedIn && identity?.username ? `/profile/${identity.username}` : null

  return (
    <div className="margo-tab-swipe-viewport">
      <PrimaryTabShell ownProfileHref={ownProfileHref} enableSwipeGesture>
        {children}
      </PrimaryTabShell>
    </div>
  )
}

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
 * Phase 2.0–2.2: viewport carries static `touch-action: pan-y`. Gesture +
 * interruptible spring settle run inside PrimaryTabShell (`enableSwipeGesture`).
 * Swipe commits no longer use CSS enter-slide — strip settle is the only motion.
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

'use client'

import { type ReactNode, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { PrimaryTabShell } from '@/components/primary-tab-shell'
import { YouTabPage } from '@/components/you-tab-page'
import { warmPrimaryTab } from '@/lib/primary-tab-prefetch'
import { warmProfile } from '@/lib/profile-warm'

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
 * Tab-bar taps use optimistic paint in PrimaryTabShell (cached pane first,
 * RSC in the background). Swipe owns strip physics; taps own discrete commits.
 */
export function TabSwipeProvider({
  children,
  chrome,
}: {
  children: ReactNode
  chrome?: ReactNode
}) {
  const { user, identity } = useIdentity()
  const router = useRouter()

  const isSignedIn = !!user && !user.isAnonymous
  const ownProfileHref = isSignedIn
    ? (identity?.username ? `/profile/${identity.username}` : '/you')
    : null
  const youPane = useMemo(() => (isSignedIn ? <YouTabPage /> : null), [isSignedIn])

  useEffect(() => {
    if (!isSignedIn) return
    router.prefetch('/you')
    warmPrimaryTab('/you')
    if (identity?.username) void warmProfile(identity.username)
  }, [isSignedIn, identity?.username, router])

  return (
    <div className="margo-tab-swipe-viewport">
      <PrimaryTabShell
        ownProfileHref={ownProfileHref}
        enableSwipeGesture
        chrome={chrome}
        youPane={youPane}
      >
        {children}
      </PrimaryTabShell>
    </div>
  )
}

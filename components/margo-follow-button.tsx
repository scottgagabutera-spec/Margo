'use client'

import { useCallback, useState } from 'react'
import { SignInLink } from '@/components/signin-link'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type MargoFollowButtonProps = {
  profileId: string
  initialFollowing?: boolean
  /** Controlled mode — parent owns follow state (profile page). */
  label?: string
  following?: boolean
  busy?: boolean
  disabled?: boolean
  onToggle?: () => void
  signInReturnTo?: string
  className?: string
  onFollowed?: (profileId: string) => void
}

/**
 * Shared Follow control — 28px gold rectangle; Following = neutral secondary.
 */
export function MargoFollowButton({
  profileId,
  initialFollowing = false,
  label,
  following: followingProp,
  busy: busyProp,
  disabled,
  onToggle,
  signInReturnTo = '/feed',
  className,
  onFollowed,
}: MargoFollowButtonProps) {
  const { user } = useAuthGate()
  const [localFollowing, setLocalFollowing] = useState(initialFollowing)
  const [localBusy, setLocalBusy] = useState(false)

  const controlled = onToggle != null
  const following = controlled ? !!followingProp : localFollowing
  const busy = controlled ? !!busyProp : localBusy
  const displayLabel = label ?? (following ? 'Following' : 'Follow')

  const toggleSelfContained = useCallback(async () => {
    if (localBusy || following) return
    if (!user || user.is_anonymous) return
    setLocalBusy(true)
    try {
      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        followee_id: profileId,
      })
      if (!error) {
        setLocalFollowing(true)
        onFollowed?.(profileId)
      }
    } finally {
      setLocalBusy(false)
    }
  }, [following, localBusy, profileId, user])

  const cls = [
    'margo-btn',
    'margo-btn--follow',
    following ? 'margo-btn--secondary' : 'margo-btn--primary',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (!user || user.is_anonymous) {
    return (
      <SignInLink
        returnTo={signInReturnTo}
        className={`${cls} margo-btn--primary`}
        aria-label="Sign in to follow"
      >
        Follow
      </SignInLink>
    )
  }

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled || busy || (!controlled && following)}
      onClick={() => {
        if (controlled) onToggle?.()
        else void toggleSelfContained()
      }}
      aria-label={displayLabel}
    >
      {displayLabel}
    </button>
  )
}

export type WhoCanMessage = 'everyone' | 'followers' | 'no_one'

export type FollowStatus = null | 'pending' | 'accepted'

export type MessageEligibility = {
  /** User may open the thread (read history). */
  canOpenThread: boolean
  /** User may send new messages (matches RLS can_message). */
  canSend: boolean
  /** Short copy for disabled composer / profile hint. */
  blockedReason: string | null
  /** False while follow relationship for this profile is still loading. */
  followKnown: boolean
}

/**
 * Client-side mirror of public.can_message() + product rules for profile chrome.
 * RLS remains authoritative on insert.
 */
export function resolveMessageEligibility(input: {
  whoCanMessage: WhoCanMessage | string | null | undefined
  followStatus: FollowStatus
  isOwnProfile: boolean
  /** When false, do not infer Message/Follow UI from a null followStatus. */
  followKnown?: boolean
}): MessageEligibility {
  if (input.isOwnProfile) {
    return { canOpenThread: false, canSend: false, blockedReason: null, followKnown: true }
  }

  const followKnown = input.followKnown !== false
  const setting = (input.whoCanMessage || 'everyone') as WhoCanMessage

  if (setting === 'no_one') {
    return {
      canOpenThread: false,
      canSend: false,
      blockedReason: 'Messages are turned off for this account.',
      followKnown: true,
    }
  }

  if (setting === 'followers' && !followKnown) {
    return {
      canOpenThread: false,
      canSend: false,
      blockedReason: null,
      followKnown: false,
    }
  }

  if (setting === 'followers' && input.followStatus !== 'accepted') {
    return {
      canOpenThread: false,
      canSend: false,
      blockedReason: 'Follow this account to message them.',
      followKnown: true,
    }
  }

  return { canOpenThread: true, canSend: true, blockedReason: null, followKnown: true }
}

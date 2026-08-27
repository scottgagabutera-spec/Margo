import type { User } from '@supabase/supabase-js'

/** True when the account was likely just created (first OAuth / sign-up session). */
export function isLikelyFirstAuthSession(user: User): boolean {
  const created = new Date(user.created_at).getTime()
  const lastSignIn = new Date(user.last_sign_in_at ?? user.created_at).getTime()
  return Math.abs(lastSignIn - created) < 120_000
}

export function userNeedsTermsAcceptance(user: User): boolean {
  const accepted = user.user_metadata?.terms_accepted_at
  if (accepted && typeof accepted === 'string') return false
  return isLikelyFirstAuthSession(user)
}

import type { Identity } from '@/hooks/useIdentity'
import { sanitizeAuthReturnPath } from '@/lib/auth-return'

/** Skippable welcome edit when the auto-generated handle is still the display name. */
export function resolvePostAuthNavigation(
  identity: Identity | null | undefined,
  returnTo?: string | null,
): string {
  if (identity && identity.displayName === identity.username) {
    const safe = sanitizeAuthReturnPath(returnTo)
    if (safe && safe !== '/profile/edit' && !safe.startsWith('/profile/edit?')) {
      return `/profile/edit?welcome=1&returnTo=${encodeURIComponent(safe)}`
    }
    return '/profile/edit?welcome=1'
  }
  return sanitizeAuthReturnPath(returnTo) || '/feed'
}

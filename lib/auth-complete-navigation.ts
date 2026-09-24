import { sanitizeAuthReturnPath } from '@/lib/auth-return'

/**
 * Full document navigation after auth/terms completion.
 * Client router.replace can leave /signin?step=terms mounted even when
 * httpOnly session cookies are already valid (manual refresh then works).
 */
export function completeAuthNavigation(returnTo?: string | null) {
  if (typeof window === 'undefined') return
  const safe = sanitizeAuthReturnPath(returnTo) || '/feed'
  window.location.assign(safe)
}

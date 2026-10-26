import { sanitizeAuthReturnPath } from './auth-return.ts'

/** OAuth server may return /signin?step=terms — must not pass through sanitizeAuthReturnPath (it blocks /signin). */
export function isOAuthTermsCompletionRedirect(path: string | null | undefined): boolean {
  if (!path) return false
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return false
  const pathOnly = trimmed.split('?')[0]
  return pathOnly === '/signin' && trimmed.includes('step=terms')
}

export function normalizeOAuthTermsCompletionRedirect(path: string | null | undefined): string {
  if (!path || !isOAuthTermsCompletionRedirect(path)) return '/signin?step=terms'
  return path.trim()
}

/** Client OAuth callback: terms path wins; otherwise shared post-auth resolver input. */
export function oauthCallbackClientReturnTo(
  serverRedirect: string | null | undefined,
): { kind: 'terms'; href: string } | { kind: 'app'; returnTo: string | null } {
  if (isOAuthTermsCompletionRedirect(serverRedirect)) {
    return { kind: 'terms', href: normalizeOAuthTermsCompletionRedirect(serverRedirect) }
  }
  const safe = sanitizeAuthReturnPath(serverRedirect) || sanitizeAuthReturnPath('/feed')
  return { kind: 'app', returnTo: safe }
}

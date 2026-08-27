/** Paths reachable without Margo terms acceptance (prevention + fallback). */
export function isConsentEnforcementExemptPath(pathname: string): boolean {
  if (!pathname) return false
  if (pathname === '/' || pathname === '/signin') return true
  if (pathname === '/terms' || pathname === '/privacy') return true
  if (pathname.startsWith('/auth/callback')) return true
  if (pathname.startsWith('/api/auth/')) return true
  return false
}

export function isTermsCompletionPage(pathname: string, step: string | null): boolean {
  return pathname === '/signin' && step === 'terms'
}

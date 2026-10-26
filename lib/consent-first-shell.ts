/** When true, product routes must not mount feed / You / data panes — terms only. */
export function shouldMountAppContent(input: {
  signedIn: boolean
  needsTermsAcceptance: boolean
  pathname: string | null | undefined
  step: string | null | undefined
}): boolean {
  const path = (input.pathname || '').split('?')[0]
  if (path === '/auth/callback') return false
  if (!input.signedIn || !input.needsTermsAcceptance) return true
  // Allow the whole sign-in surface (LegalConsentEnforcer adds step=terms) — avoids blank flash.
  if (path === '/signin') return true
  return false
}

export function consentFirstRedirectHref(
  returnTo: string | null | undefined,
): string {
  const params = new URLSearchParams({ step: 'terms' })
  const safe = returnTo?.trim()
  if (safe && safe.startsWith('/') && !safe.startsWith('//')) {
    params.set('returnTo', safe)
  }
  return `/signin?${params.toString()}`
}

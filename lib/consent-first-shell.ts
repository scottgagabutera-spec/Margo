/** When true, product routes must not mount feed / You / data panes — terms only. */
export function shouldMountAppContent(input: {
  signedIn: boolean
  needsTermsAcceptance: boolean
  pathname: string | null | undefined
  step: string | null | undefined
}): boolean {
  if (!input.signedIn || !input.needsTermsAcceptance) return true
  const path = (input.pathname || '').split('?')[0]
  return path === '/signin' && input.step === 'terms'
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

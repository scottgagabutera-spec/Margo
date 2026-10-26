/**
 * OAuth from the sign-in screen still creates a new auth user on first provider login.
 * Treat post-auth terms + welcome the same as explicit sign-up (provider-blind).
 */
export function oauthShouldPromptTermsAfterExchange(
  needsTerms: boolean,
): boolean {
  return needsTerms
}

/** Sign-in and sign-up OAuth both land on terms when Margo consent is missing. */
export function oauthPostExchangeRedirect(
  needsTerms: boolean,
  oauthReturn: string | null,
): string {
  if (!needsTerms) return oauthReturn || '/feed'
  const params = new URLSearchParams({ step: 'terms' })
  if (oauthReturn) params.set('returnTo', oauthReturn)
  return `/signin?${params.toString()}`
}

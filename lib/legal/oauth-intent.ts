/** Short-lived cookie set when starting OAuth from the Create account flow. */
export const OAUTH_TERMS_PENDING_COOKIE = 'margo_oauth_terms_pending'
export const OAUTH_INTENT_COOKIE = 'margo_oauth_intent'

export type OAuthIntent = 'signup' | 'signin'

export function parseOAuthIntent(value: string | null | undefined): OAuthIntent {
  return value === 'signup' ? 'signup' : 'signin'
}

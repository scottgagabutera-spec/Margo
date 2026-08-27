/** Identifier for the Terms/Privacy bundle shown at signup. Update when policies materially change. */
export const MARGO_TERMS_VERSION = '2026-08'

/**
 * Accounts created before this instant are grandfathered from the consent gate.
 * Tied to MARGO_TERMS_VERSION — no migration; uses auth.users.created_at.
 */
export const MARGO_CONSENT_ENFORCEMENT_START = '2026-08-01T00:00:00.000Z'

import type { User } from '@supabase/supabase-js'
import { MARGO_CONSENT_ENFORCEMENT_START, MARGO_TERMS_VERSION } from '@/lib/legal/terms-version'

export interface LegalConsentSettings {
  termsAcceptedAt: string
  termsVersion: string
}

export function buildLegalConsentSettings(): LegalConsentSettings {
  return {
    termsAcceptedAt: new Date().toISOString(),
    termsVersion: MARGO_TERMS_VERSION,
  }
}

export function mergeLegalConsentIntoSettings(
  existing: Record<string, unknown> | null | undefined,
  legal: LegalConsentSettings,
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  return {
    ...base,
    legal,
  }
}

export function legalConsentFromUserMetadata(
  meta: Record<string, unknown> | null | undefined,
): LegalConsentSettings | null {
  if (!meta?.terms_accepted_at || typeof meta.terms_accepted_at !== 'string') return null
  return {
    termsAcceptedAt: meta.terms_accepted_at,
    termsVersion: typeof meta.terms_version === 'string' ? meta.terms_version : MARGO_TERMS_VERSION,
  }
}

export function hasTermsAcceptanceRecorded(
  meta: Record<string, unknown> | null | undefined,
): boolean {
  const accepted = meta?.terms_accepted_at
  return typeof accepted === 'string' && accepted.length > 0
}

/** True when this account must accept Margo Terms/Privacy (not grandfathered). */
export function isSubjectToMargoConsentRequirement(user: User): boolean {
  const createdAt = new Date(user.created_at).getTime()
  const enforcementStart = new Date(MARGO_CONSENT_ENFORCEMENT_START).getTime()
  return createdAt >= enforcementStart
}

/** Server-side consent gate — based on recorded Margo acceptance, not OAuth provider. */
export function userNeedsTermsAcceptance(user: User): boolean {
  if (!isSubjectToMargoConsentRequirement(user)) return false
  return !hasTermsAcceptanceRecorded(user.user_metadata as Record<string, unknown>)
}

import { MARGO_TERMS_VERSION } from '@/lib/legal/terms-version'

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

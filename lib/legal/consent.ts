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
): Record<string, unknown> {
  const base = existing && typeof existing === 'object' ? { ...existing } : {}
  return {
    ...base,
    legal: buildLegalConsentSettings(),
  }
}

import * as Sentry from '@sentry/nextjs'
import { isSentryConfigured } from '@/lib/observability/sentry-options'
import { SENTRY_E2E_TEST_MESSAGE } from '@/lib/observability/sentry-test-constants'

export function isSentryTestAuthorized(headerValue: string | null): boolean {
  const secret = process.env.SENTRY_TEST_SECRET?.trim()
  if (!secret || !headerValue) return false
  return headerValue === secret
}

/** Server-only: capture a tagged test exception and wait for ingest. */
export async function fireSentryE2ETest(): Promise<{ ok: boolean; eventId: string | null; reason?: string }> {
  if (!isSentryConfigured()) {
    return { ok: false, eventId: null, reason: 'sentry_not_configured' }
  }
  const err = new Error(SENTRY_E2E_TEST_MESSAGE)
  const eventId = Sentry.captureException(err, {
    tags: { margo_sentry_test: 'true', source: 'sentry-e2e-test' },
    level: 'error',
  })
  await Sentry.flush(5000)
  return { ok: true, eventId: eventId ?? null }
}

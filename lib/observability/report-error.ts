import { captureException, captureMessage, withScope } from '@sentry/nextjs'
import { isSentryConfigured } from '@/lib/observability/sentry-options'

/**
 * Thin Sentry adapter — import this instead of @sentry/nextjs in app code
 * so we can remove or swap providers from one place.
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!isSentryConfigured()) return
  try {
    if (context && Object.keys(context).length > 0) {
      withScope((scope) => {
        scope.setExtras(context)
        captureException(error)
      })
      return
    }
    captureException(error)
  } catch {
    // Observability must never block UX.
  }
}

export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>,
): void {
  if (!isSentryConfigured()) return
  try {
    if (context && Object.keys(context).length > 0) {
      withScope((scope) => {
        scope.setExtras(context)
        captureMessage(message, level)
      })
      return
    }
    captureMessage(message, level)
  } catch {
    // noop
  }
}

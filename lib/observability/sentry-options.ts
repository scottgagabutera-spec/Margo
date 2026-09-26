import type { BrowserOptions, EdgeOptions, NodeOptions } from '@sentry/nextjs'

function readDsn(): string | undefined {
  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    undefined
  return dsn || undefined
}

/** Kill-switch without removing env vars (e.g. local dev). */
export function isSentryConfigured(): boolean {
  if (process.env.SENTRY_ENABLED === 'false') return false
  return !!readDsn()
}

function sentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    'development'
  )
}

function baseOptions(): { dsn: string | undefined; enabled: boolean; environment: string } {
  return {
    dsn: readDsn(),
    enabled: isSentryConfigured(),
    environment: sentryEnvironment(),
  }
}

/** Shared defaults — no performance tracing or replay in pass 1. */
function sharedIntegrationsDefaults() {
  return {
    tracesSampleRate: 0,
    sendDefaultPii: false,
    debug: process.env.SENTRY_DEBUG === 'true',
  }
}

export function getSentryClientOptions(): BrowserOptions {
  return {
    ...baseOptions(),
    ...sharedIntegrationsDefaults(),
  }
}

export function getSentryServerOptions(): NodeOptions {
  return {
    ...baseOptions(),
    ...sharedIntegrationsDefaults(),
  }
}

export function getSentryEdgeOptions(): EdgeOptions {
  return {
    ...baseOptions(),
    ...sharedIntegrationsDefaults(),
  }
}

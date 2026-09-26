import * as Sentry from '@sentry/nextjs'
import { getSentryClientOptions } from '@/lib/observability/sentry-options'

Sentry.init(getSentryClientOptions())

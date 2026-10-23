import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number }

/**
 * Hour-bucket counter in api_rate_limits (service_role only — no public RLS policies).
 */
async function readHourlyRateLimitCount(opts: {
  route: string
  bucket: string
  failOpenOnDbError?: boolean
}): Promise<
  | { ok: true; count: number; windowStart: string }
  | { ok: false; retryAfterSec: number }
> {
  const windowStart = hourStartUtc(new Date())
  const admin = getSupabaseAdmin()
  if (!admin) {
    if (opts.failOpenOnDbError) return { ok: true, count: 0, windowStart }
    return { ok: false, retryAfterSec: 3600 }
  }

  const { data: row, error: readErr } = await admin
    .from('api_rate_limits')
    .select('count')
    .eq('route', opts.route)
    .eq('bucket', opts.bucket)
    .eq('window_start', windowStart)
    .maybeSingle()

  if (readErr) {
    console.error('[api-rate-limit] read failed', readErr.message)
    if (opts.failOpenOnDbError) return { ok: true, count: 0, windowStart }
    return { ok: false, retryAfterSec: 3600 }
  }

  return { ok: true, count: Number(row?.count ?? 0), windowStart }
}

/** Read-only: under the hourly cap (does not increment). */
export async function isHourlyApiRateLimitAvailable(opts: {
  route: string
  bucket: string
  limit: number
  failOpenOnDbError?: boolean
}): Promise<RateLimitResult> {
  const read = await readHourlyRateLimitCount(opts)
  if (!read.ok) return read
  if (read.count >= opts.limit) {
    return { ok: false, retryAfterSec: secondsUntilNextHourUtc(new Date()) }
  }
  return { ok: true }
}

export async function consumeHourlyApiRateLimit(opts: {
  route: string
  bucket: string
  limit: number
  /** Allow request when counter read/write fails (low-cost routes only). */
  failOpenOnDbError?: boolean
}): Promise<RateLimitResult> {
  const read = await readHourlyRateLimitCount(opts)
  if (!read.ok) return read

  const current = read.count
  if (current >= opts.limit) {
    return { ok: false, retryAfterSec: secondsUntilNextHourUtc(new Date()) }
  }

  const next = current + 1
  const admin = getSupabaseAdmin()
  if (!admin) {
    if (opts.failOpenOnDbError) return { ok: true }
    return { ok: false, retryAfterSec: 3600 }
  }

  const { error: writeErr } = await admin.from('api_rate_limits').upsert(
    {
      route: opts.route,
      bucket: opts.bucket,
      window_start: read.windowStart,
      count: next,
    },
    { onConflict: 'route,bucket,window_start' },
  )

  if (writeErr) {
    console.error('[api-rate-limit] write failed', writeErr.message)
    if (opts.failOpenOnDbError) return { ok: true }
    return { ok: false, retryAfterSec: 3600 }
  }

  return { ok: true }
}

function hourStartUtc(d: Date): string {
  const x = new Date(d)
  x.setUTCMinutes(0, 0, 0)
  return x.toISOString()
}

function secondsUntilNextHourUtc(d: Date): number {
  const next = new Date(d)
  next.setUTCMinutes(0, 0, 0)
  next.setUTCHours(next.getUTCHours() + 1)
  return Math.max(1, Math.ceil((next.getTime() - d.getTime()) / 1000))
}

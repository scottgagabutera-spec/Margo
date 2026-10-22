import type { NextRequest } from 'next/server'
import { createHash } from 'crypto'

/** First client IP from Vercel/proxy headers (shared-carrier aware — limits are generous). */
export function getRequestClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  return 'unknown'
}

export function ipRateLimitBucket(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

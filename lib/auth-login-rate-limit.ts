import type { NextRequest } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'

export const LOGIN_RATE_LIMIT_MESSAGE =
  'Too many attempts. Please wait a few minutes and try again.'

const LOGIN_IP_LIMIT = 40
const LOGIN_EMAIL_LIMIT = 12

export function clientIpFromRequest(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 120)
  }
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 120)
  return 'unknown'
}

/** Per-IP and per-email hourly buckets in api_rate_limits (existing table). */
export async function enforceAuthLoginRateLimit(
  req: NextRequest,
  email: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const ip = clientIpFromRequest(req)
  const normalizedEmail = email.trim().toLowerCase().slice(0, 200)

  const ipGate = await consumeHourlyApiRateLimit({
    route: 'auth-login',
    bucket: `ip:${ip}`,
    limit: LOGIN_IP_LIMIT,
    failOpenOnDbError: true,
  })
  if (!ipGate.ok) return ipGate

  if (normalizedEmail) {
    const emailGate = await consumeHourlyApiRateLimit({
      route: 'auth-login',
      bucket: `email:${normalizedEmail}`,
      limit: LOGIN_EMAIL_LIMIT,
      failOpenOnDbError: true,
    })
    if (!emailGate.ok) return emailGate
  }

  return { ok: true }
}

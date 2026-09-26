import { NextResponse, type NextRequest } from 'next/server'
import { requirePromoteSessionWithTimeout } from '@/lib/promote/api-auth'
import { buildPromoteOAuthReturnUrl, normalizePromoteOAuthReturnPath } from '@/lib/promote/oauth-return-redirect'
import { resolvePromoteOAuthOrigin } from '@/lib/promote/oauth-public-origin'
import { MARGO_AUTO_PROMOTE_SETTINGS_PATH } from '@/lib/promote/settings-anchor'

export type PromoteOAuthStartErrorCode = 'denied' | 'facebook_error' | 'youtube_error' | 'tiktok_error' | 'server_error'

export function resolvePromoteOAuthStartContext(request: NextRequest) {
  const origin = resolvePromoteOAuthOrigin(request)
  const returnTo = request.nextUrl.searchParams.get('returnTo') || MARGO_AUTO_PROMOTE_SETTINGS_PATH
  const safeReturn = normalizePromoteOAuthReturnPath(returnTo)
  return { origin, safeReturn }
}

export type GatePromoteOAuthStartResult =
  | { allowed: false; response: NextResponse }
  | { allowed: true; userId: string; origin: string; safeReturn: string }

export async function gatePromoteOAuthStart(
  request: NextRequest,
  timeoutErrorCode: PromoteOAuthStartErrorCode,
): Promise<GatePromoteOAuthStartResult> {
  const { origin, safeReturn } = resolvePromoteOAuthStartContext(request)
  const session = await requirePromoteSessionWithTimeout()
  if (!session.ok) {
    if (session.reason === 'timeout') {
      console.error(`[promote/oauth start] session check timed out (${timeoutErrorCode})`)
      return {
        allowed: false,
        response: NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, safeReturn, timeoutErrorCode)),
      }
    }
    return {
      allowed: false,
      response: NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, safeReturn, 'denied')),
    }
  }
  return { allowed: true, userId: session.userId, origin, safeReturn }
}

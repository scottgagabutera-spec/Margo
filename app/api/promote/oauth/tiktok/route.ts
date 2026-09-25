import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { buildPromoteOAuthReturnUrl, normalizePromoteOAuthReturnPath } from '@/lib/promote/oauth-return-redirect'
import { resolvePromoteOAuthOrigin } from '@/lib/promote/oauth-public-origin'
import { MARGO_AUTO_PROMOTE_SETTINGS_PATH } from '@/lib/promote/settings-anchor'
import { createTikTokOAuthPending } from '@/lib/promote/tiktok-oauth-pending'
import {
  buildTikTokAuthorizeUrl,
  buildTikTokOAuthState,
  PROMOTE_TIKTOK_COOKIE_OPTS,
  PROMOTE_TIKTOK_RETURN_COOKIE,
  PROMOTE_TIKTOK_STATE_COOKIE,
} from '@/lib/promote/tiktok-oauth'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = resolvePromoteOAuthOrigin(request)
  if (!session) {
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, MARGO_AUTO_PROMOTE_SETTINGS_PATH, 'denied'),
    )
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') || MARGO_AUTO_PROMOTE_SETTINGS_PATH
  const safeReturn = normalizePromoteOAuthReturnPath(returnTo)

  const admin = getPromoteAdmin()
  if (!admin) {
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, safeReturn, 'server_error'),
    )
  }

  try {
    const state = buildTikTokOAuthState()
    await createTikTokOAuthPending(admin, state, session.userId, safeReturn)
    const url = buildTikTokAuthorizeUrl(origin, state)
    const res = NextResponse.redirect(url)
    res.cookies.set(PROMOTE_TIKTOK_STATE_COOKIE, state, PROMOTE_TIKTOK_COOKIE_OPTS)
    res.cookies.set(PROMOTE_TIKTOK_RETURN_COOKIE, safeReturn, PROMOTE_TIKTOK_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/tiktok oauth]', err)
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, safeReturn, 'tiktok_error'),
    )
  }
}

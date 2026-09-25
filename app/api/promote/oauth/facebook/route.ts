import { NextResponse, type NextRequest } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import {
  buildFacebookAuthorizeUrl,
  buildFacebookOAuthState,
  PROMOTE_FACEBOOK_COOKIE_OPTS,
  PROMOTE_FACEBOOK_RETURN_COOKIE,
  PROMOTE_FACEBOOK_STATE_COOKIE,
} from '@/lib/promote/facebook-oauth'
import { buildPromoteOAuthReturnUrl, normalizePromoteOAuthReturnPath } from '@/lib/promote/oauth-return-redirect'
import { resolvePromoteOAuthOrigin } from '@/lib/promote/oauth-public-origin'
import { MARGO_AUTO_PROMOTE_SETTINGS_PATH } from '@/lib/promote/settings-anchor'

export async function GET(request: NextRequest) {
  const origin = resolvePromoteOAuthOrigin(request)
  const session = await requirePromoteSession()
  if (!session) {
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, MARGO_AUTO_PROMOTE_SETTINGS_PATH, 'denied'),
    )
  }

  const returnTo = request.nextUrl.searchParams.get('returnTo') || MARGO_AUTO_PROMOTE_SETTINGS_PATH
  const safeReturn = normalizePromoteOAuthReturnPath(returnTo)

  try {
    const state = buildFacebookOAuthState()
    const url = buildFacebookAuthorizeUrl(origin, state)
    const res = NextResponse.redirect(url)
    res.cookies.set(PROMOTE_FACEBOOK_STATE_COOKIE, state, PROMOTE_FACEBOOK_COOKIE_OPTS)
    res.cookies.set(PROMOTE_FACEBOOK_RETURN_COOKIE, safeReturn, PROMOTE_FACEBOOK_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/facebook oauth]', err)
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, safeReturn, 'facebook_error'),
    )
  }
}

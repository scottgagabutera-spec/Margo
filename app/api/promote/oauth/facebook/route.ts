import { NextResponse, type NextRequest } from 'next/server'
import {
  buildFacebookAuthorizeUrl,
  buildFacebookOAuthState,
  PROMOTE_FACEBOOK_COOKIE_OPTS,
  PROMOTE_FACEBOOK_RETURN_COOKIE,
  PROMOTE_FACEBOOK_STATE_COOKIE,
} from '@/lib/promote/facebook-oauth'
import { buildPromoteOAuthReturnUrl } from '@/lib/promote/oauth-return-redirect'
import { gatePromoteOAuthStart } from '@/lib/promote/oauth-start-handler'
import { isPromotePlatformLive } from '@/lib/promote/platforms'

export async function GET(request: NextRequest) {
  const gate = await gatePromoteOAuthStart(request, 'facebook_error')
  if (!gate.allowed) return gate.response

  const { origin, safeReturn } = gate

  if (!isPromotePlatformLive('facebook')) {
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, safeReturn, 'facebook_error'),
    )
  }

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

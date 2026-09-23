import { NextResponse, type NextRequest } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import {
  buildFacebookAuthorizeUrl,
  buildFacebookOAuthState,
  PROMOTE_FACEBOOK_COOKIE_OPTS,
  PROMOTE_FACEBOOK_RETURN_COOKIE,
  PROMOTE_FACEBOOK_STATE_COOKIE,
} from '@/lib/promote/facebook-oauth'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  if (!session) {
    return NextResponse.redirect(new URL('/settings?promote=denied', request.url))
  }

  const origin = new URL(request.url).origin
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/settings'
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings'

  try {
    const state = buildFacebookOAuthState()
    const url = buildFacebookAuthorizeUrl(origin, state)
    const res = NextResponse.redirect(url)
    res.cookies.set(PROMOTE_FACEBOOK_STATE_COOKIE, state, PROMOTE_FACEBOOK_COOKIE_OPTS)
    res.cookies.set(PROMOTE_FACEBOOK_RETURN_COOKIE, safeReturn, PROMOTE_FACEBOOK_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/facebook oauth]', err)
    return NextResponse.redirect(new URL(`${safeReturn}?promote=facebook_error`, request.url))
  }
}

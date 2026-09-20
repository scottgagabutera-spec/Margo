import { NextResponse, type NextRequest } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import {
  buildPkcePair,
  buildYouTubeAuthorizeUrl,
  buildYouTubeOAuthState,
  PROMOTE_OAUTH_RETURN_COOKIE,
  PROMOTE_OAUTH_STATE_COOKIE,
  PROMOTE_OAUTH_VERIFIER_COOKIE,
  PROMOTE_YOUTUBE_COOKIE_OPTS,
} from '@/lib/promote/youtube-oauth'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  if (!session) {
    return NextResponse.redirect(new URL('/settings?promote=denied', request.url))
  }

  const origin = new URL(request.url).origin
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/settings'
  const safeReturn = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings'

  try {
    const state = buildYouTubeOAuthState()
    const { verifier, challenge } = buildPkcePair()
    const url = buildYouTubeAuthorizeUrl(origin, state, challenge)
    const res = NextResponse.redirect(url)
    res.cookies.set(PROMOTE_OAUTH_STATE_COOKIE, state, PROMOTE_YOUTUBE_COOKIE_OPTS)
    res.cookies.set(PROMOTE_OAUTH_VERIFIER_COOKIE, verifier, PROMOTE_YOUTUBE_COOKIE_OPTS)
    res.cookies.set(PROMOTE_OAUTH_RETURN_COOKIE, safeReturn, PROMOTE_YOUTUBE_COOKIE_OPTS)
    return res
  } catch (err) {
    console.error('[promote/youtube oauth]', err)
    return NextResponse.redirect(new URL(`${safeReturn}?promote=youtube_error`, request.url))
  }
}

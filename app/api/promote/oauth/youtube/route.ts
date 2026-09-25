import { NextResponse, type NextRequest } from 'next/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { buildPromoteOAuthReturnUrl, normalizePromoteOAuthReturnPath } from '@/lib/promote/oauth-return-redirect'
import { resolvePromoteOAuthOrigin } from '@/lib/promote/oauth-public-origin'
import { MARGO_AUTO_PROMOTE_SETTINGS_PATH } from '@/lib/promote/settings-anchor'
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
    return NextResponse.redirect(
      buildPromoteOAuthReturnUrl(origin, safeReturn, 'youtube_error'),
    )
  }
}

import { NextResponse, type NextRequest } from 'next/server'
import { buildPromoteOAuthReturnUrl } from '@/lib/promote/oauth-return-redirect'
import { gatePromoteOAuthStart } from '@/lib/promote/oauth-start-handler'
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
  const gate = await gatePromoteOAuthStart(request, 'youtube_error')
  if (!gate.allowed) return gate.response

  const { origin, safeReturn } = gate

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

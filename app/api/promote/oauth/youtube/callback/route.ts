import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { buildPromoteOAuthReturnUrl } from '@/lib/promote/oauth-return-redirect'
import { resolvePromoteOAuthOrigin } from '@/lib/promote/oauth-public-origin'
import { encryptPromoteToken } from '@/lib/promote/token-vault'
import {
  exchangeYouTubeCode,
  fetchYouTubeChannel,
  PROMOTE_OAUTH_RETURN_COOKIE,
  PROMOTE_OAUTH_STATE_COOKIE,
  PROMOTE_OAUTH_VERIFIER_COOKIE,
} from '@/lib/promote/youtube-oauth'

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = resolvePromoteOAuthOrigin(request)
  const returnTo = request.cookies.get(PROMOTE_OAUTH_RETURN_COOKIE)?.value || '/settings'

  const clearCookies = (res: NextResponse) => {
    res.cookies.delete(PROMOTE_OAUTH_STATE_COOKIE)
    res.cookies.delete(PROMOTE_OAUTH_VERIFIER_COOKIE)
    res.cookies.delete(PROMOTE_OAUTH_RETURN_COOKIE)
    return res
  }

  if (!session) {
    return clearCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'denied')),
    )
  }

  const params = request.nextUrl.searchParams
  if (params.get('error')) {
    return clearCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'youtube_denied')),
    )
  }

  const code = params.get('code')
  const state = params.get('state')
  const expectedState = request.cookies.get(PROMOTE_OAUTH_STATE_COOKIE)?.value
  const verifier = request.cookies.get(PROMOTE_OAUTH_VERIFIER_COOKIE)?.value

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return clearCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'youtube_invalid')),
    )
  }

  const admin = getPromoteAdmin()
  if (!admin) {
    return clearCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'server_error')),
    )
  }

  try {
    const tokens = await exchangeYouTubeCode(origin, code, verifier)
    const channel = await fetchYouTubeChannel(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const row = {
      profile_id: session.userId,
      platform: 'youtube' as const,
      status: 'connected' as const,
      external_account_id: channel.channelId,
      external_username: channel.title,
      access_token_enc: encryptPromoteToken(tokens.access_token),
      refresh_token_enc: tokens.refresh_token
        ? encryptPromoteToken(tokens.refresh_token)
        : null,
      token_expires_at: expiresAt,
      scopes: tokens.scope.split(' ').filter(Boolean),
      platform_meta: { channelId: channel.channelId },
      connected_at: new Date().toISOString(),
      last_error: null,
    }

    const { error } = await admin
      .from('artist_social_connections')
      .upsert(row, { onConflict: 'profile_id,platform' })

    if (error) throw error

    await admin
      .from('artist_promote_settings')
      .upsert({ profile_id: session.userId }, { onConflict: 'profile_id' })

    return clearCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'youtube_connected')),
    )
  } catch (err) {
    console.error('[promote/youtube callback]', err)
    return clearCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'youtube_error')),
    )
  }
}

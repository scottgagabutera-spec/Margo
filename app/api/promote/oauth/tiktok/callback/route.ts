import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { saveTikTokConnection } from '@/lib/promote/tiktok-connection'
import { logTikTokOAuthCallback } from '@/lib/promote/tiktok-oauth-callback-log'
import { consumeTikTokOAuthPending } from '@/lib/promote/tiktok-oauth-pending'
import {
  exchangeTikTokCode,
  fetchTikTokUserInfo,
  PROMOTE_TIKTOK_RETURN_COOKIE,
  PROMOTE_TIKTOK_STATE_COOKIE,
  TikTokOAuthTokenError,
  TikTokOAuthUserInfoError,
} from '@/lib/promote/tiktok-oauth'

function safeReturnPath(raw: string | undefined | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw
  return '/settings'
}

function tiktokLogIdFromError(err: unknown): string | undefined {
  if (err instanceof TikTokOAuthTokenError || err instanceof TikTokOAuthUserInfoError) {
    return err.logId
  }
  return undefined
}

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = new URL(request.url).origin
  const params = request.nextUrl.searchParams

  const clearOAuthCookies = (res: NextResponse) => {
    res.cookies.delete(PROMOTE_TIKTOK_STATE_COOKIE)
    res.cookies.delete(PROMOTE_TIKTOK_RETURN_COOKIE)
    return res
  }

  const admin = getPromoteAdmin()

  if (params.get('error')) {
    const returnTo = safeReturnPath(request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value)
    logTikTokOAuthCallback('oauth_denied', { has_session: Boolean(session) })
    return clearOAuthCookies(
      NextResponse.redirect(`${origin}${returnTo}?promote=tiktok_denied`),
    )
  }

  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state) {
    const returnTo = safeReturnPath(request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value)
    logTikTokOAuthCallback('bad_state', {
      has_code: Boolean(code),
      has_state: Boolean(state),
      has_session: Boolean(session),
    })
    return clearOAuthCookies(
      NextResponse.redirect(`${origin}${returnTo}?promote=tiktok_invalid`),
    )
  }

  if (!admin) {
    const returnTo = safeReturnPath(request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value)
    logTikTokOAuthCallback('no_admin', { has_session: Boolean(session) })
    return clearOAuthCookies(
      NextResponse.redirect(`${origin}${returnTo}?promote=server_error`),
    )
  }

  let profileId: string | null = null
  let returnTo = safeReturnPath(request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value)

  try {
    const pending = await consumeTikTokOAuthPending(admin, state)
    if (pending) {
      profileId = pending.profile_id
      returnTo = pending.return_to
    }
  } catch (err) {
    logTikTokOAuthCallback('save_error', {
      phase: 'pending_consume',
      message: err instanceof Error ? err.message : 'unknown',
    })
    return clearOAuthCookies(
      NextResponse.redirect(`${origin}${returnTo}?promote=server_error`),
    )
  }

  if (!profileId) {
    const cookieState = request.cookies.get(PROMOTE_TIKTOK_STATE_COOKIE)?.value
    if (session && cookieState && cookieState === state) {
      profileId = session.userId
    } else {
      logTikTokOAuthCallback(session ? 'pending_expired' : 'no_session_no_pending', {
        has_session: Boolean(session),
        cookie_state_match: Boolean(cookieState && cookieState === state),
      })
      return clearOAuthCookies(
        NextResponse.redirect(`${origin}${returnTo}?promote=tiktok_invalid`),
      )
    }
  } else if (session && session.userId !== profileId) {
    logTikTokOAuthCallback('session_mismatch', {
      has_session: true,
    })
    return clearOAuthCookies(
      NextResponse.redirect(`${origin}${returnTo}?promote=tiktok_invalid`),
    )
  }

  const redirectBase = `${origin}${returnTo}`

  try {
    const tokens = await exchangeTikTokCode(origin, code)
    const user = await fetchTikTokUserInfo(tokens.access_token)
    await saveTikTokConnection(admin, profileId, tokens, user)
    logTikTokOAuthCallback('ok', { has_session: Boolean(session) })
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=tiktok_connected`))
  } catch (err) {
    const logId = tiktokLogIdFromError(err)
    if (err instanceof TikTokOAuthTokenError) {
      logTikTokOAuthCallback('token_error', {
        log_id: logId ?? null,
        tiktok_error: err.tiktokError ?? null,
        message: err.message,
      })
    } else if (err instanceof TikTokOAuthUserInfoError) {
      logTikTokOAuthCallback('user_info_error', {
        log_id: logId ?? null,
        tiktok_code: err.tiktokCode ?? null,
        message: err.message,
      })
    } else {
      logTikTokOAuthCallback('save_error', {
        log_id: logId ?? null,
        message: err instanceof Error ? err.message : 'unknown',
      })
    }
    return clearOAuthCookies(NextResponse.redirect(`${redirectBase}?promote=tiktok_error`))
  }
}

import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { buildPromoteOAuthReturnUrl, normalizePromoteOAuthReturnPath } from '@/lib/promote/oauth-return-redirect'
import { resolvePromoteOAuthOrigin } from '@/lib/promote/oauth-public-origin'
import { saveTikTokConnection } from '@/lib/promote/tiktok-connection'
import { logTikTokOAuthCallback } from '@/lib/promote/tiktok-oauth-callback-log'
import {
  clearTikTokOAuthPending,
  resolveTikTokOAuthPending,
} from '@/lib/promote/tiktok-oauth-pending'
import {
  exchangeTikTokCode,
  fetchTikTokUserInfo,
  PROMOTE_TIKTOK_RETURN_COOKIE,
  PROMOTE_TIKTOK_STATE_COOKIE,
  TikTokOAuthTokenError,
  TikTokOAuthUserInfoError,
  type TikTokUserInfo,
} from '@/lib/promote/tiktok-oauth'

function tiktokLogIdFromError(err: unknown): string | undefined {
  if (err instanceof TikTokOAuthTokenError || err instanceof TikTokOAuthUserInfoError) {
    return err.logId
  }
  return undefined
}

function redirectToSettings(
  origin: string,
  returnTo: string,
  promote: string,
  clearCookies: (res: NextResponse) => NextResponse,
): NextResponse {
  return clearCookies(
    NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, promote)),
  )
}

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  const origin = resolvePromoteOAuthOrigin(request)
  const params = request.nextUrl.searchParams

  const clearOAuthCookies = (res: NextResponse) => {
    res.cookies.delete(PROMOTE_TIKTOK_STATE_COOKIE)
    res.cookies.delete(PROMOTE_TIKTOK_RETURN_COOKIE)
    return res
  }

  const admin = getPromoteAdmin()

  if (params.get('error')) {
    const returnTo = normalizePromoteOAuthReturnPath(
      request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value,
    )
    logTikTokOAuthCallback('oauth_denied', { has_session: Boolean(session) })
    return redirectToSettings(origin, returnTo, 'tiktok_denied', clearOAuthCookies)
  }

  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state) {
    const returnTo = normalizePromoteOAuthReturnPath(
      request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value,
    )
    logTikTokOAuthCallback('bad_state', {
      has_code: Boolean(code),
      has_state: Boolean(state),
      has_session: Boolean(session),
    })
    return redirectToSettings(origin, returnTo, 'tiktok_invalid', clearOAuthCookies)
  }

  if (!admin) {
    const returnTo = normalizePromoteOAuthReturnPath(
      request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value,
    )
    logTikTokOAuthCallback('no_admin', { has_session: Boolean(session) })
    return redirectToSettings(origin, returnTo, 'server_error', clearOAuthCookies)
  }

  let profileId: string | null = null
  let returnTo = normalizePromoteOAuthReturnPath(
    request.cookies.get(PROMOTE_TIKTOK_RETURN_COOKIE)?.value,
  )
  let pendingResolved = false

  try {
    const pending = await resolveTikTokOAuthPending(admin, state)
    if (pending) {
      profileId = pending.profile_id
      returnTo = normalizePromoteOAuthReturnPath(pending.return_to)
      pendingResolved = true
    }
  } catch (err) {
    logTikTokOAuthCallback('save_error', {
      phase: 'pending_resolve',
      message: err instanceof Error ? err.message : 'unknown',
    })
    return redirectToSettings(origin, returnTo, 'server_error', clearOAuthCookies)
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
      return redirectToSettings(origin, returnTo, 'tiktok_invalid', clearOAuthCookies)
    }
  } else if (session && session.userId !== profileId) {
    logTikTokOAuthCallback('session_mismatch', {
      has_session: true,
      using_pending_profile: true,
    })
  }

  try {
    const tokens = await exchangeTikTokCode(origin, code)
    let user: TikTokUserInfo
    try {
      user = await fetchTikTokUserInfo(tokens.access_token)
    } catch (userErr) {
      const logId = tiktokLogIdFromError(userErr)
      logTikTokOAuthCallback('user_info_error', {
        log_id: logId ?? null,
        message: userErr instanceof Error ? userErr.message : 'unknown',
        fallback: true,
      })
      const openId = tokens.open_id?.trim()
      if (!openId) throw userErr
      user = {
        openId,
        displayName: 'TikTok',
        username: null,
      }
    }

    await saveTikTokConnection(admin, profileId, tokens, user)
    if (pendingResolved) {
      await clearTikTokOAuthPending(admin, state)
    }
    logTikTokOAuthCallback('ok', { has_session: Boolean(session) })
    return clearOAuthCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'tiktok_connected')),
    )
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
    return clearOAuthCookies(
      NextResponse.redirect(buildPromoteOAuthReturnUrl(origin, returnTo, 'tiktok_error')),
    )
  }
}

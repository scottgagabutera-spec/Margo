import { randomBytes } from 'crypto'
import { getActiveTikTokPromoteCredentials } from '@/lib/promote/tiktok-promote-config'

export const TIKTOK_OPEN_API = 'https://open.tiktokapis.com'
export const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/'

/** Login Kit + Content Posting (Direct Post). */
export const TIKTOK_PROMOTE_SCOPES = [
  'user.info.basic',
  'video.publish',
].join(',')

const PROMOTE_TIKTOK_STATE_COOKIE = 'margo_promote_tiktok_oauth_state'
const PROMOTE_TIKTOK_RETURN_COOKIE = 'margo_promote_tiktok_return'

export const PROMOTE_TIKTOK_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10,
}

export {
  PROMOTE_TIKTOK_STATE_COOKIE,
  PROMOTE_TIKTOK_RETURN_COOKIE,
}

export interface TikTokTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  open_id: string
  scope: string
  token_type: string
  error?: string
  error_description?: string
  log_id?: string
}

export class TikTokOAuthTokenError extends Error {
  readonly logId?: string
  readonly tiktokError?: string

  constructor(message: string, opts?: { logId?: string; tiktokError?: string }) {
    super(message)
    this.name = 'TikTokOAuthTokenError'
    this.logId = opts?.logId
    this.tiktokError = opts?.tiktokError
  }
}

export class TikTokOAuthUserInfoError extends Error {
  readonly logId?: string
  readonly tiktokCode?: string

  constructor(message: string, opts?: { logId?: string; tiktokCode?: string }) {
    super(message)
    this.name = 'TikTokOAuthUserInfoError'
    this.logId = opts?.logId
    this.tiktokCode = opts?.tiktokCode
  }
}

export interface TikTokUserInfo {
  openId: string
  displayName: string
  username: string | null
}

function tiktokClientKey(): string {
  return getActiveTikTokPromoteCredentials().clientKey
}

function tiktokClientSecret(): string {
  return getActiveTikTokPromoteCredentials().clientSecret
}

export function buildTikTokOAuthState(): string {
  return randomBytes(24).toString('base64url')
}

export function buildTikTokAuthorizeUrl(origin: string, state: string): string {
  const redirectUri = `${origin}/api/promote/oauth/tiktok/callback`
  const params = new URLSearchParams({
    client_key: tiktokClientKey(),
    response_type: 'code',
    scope: TIKTOK_PROMOTE_SCOPES,
    redirect_uri: redirectUri,
    state,
    disable_auto_auth: '1',
  })
  return `${TIKTOK_AUTH_URL}?${params.toString()}`
}

async function postTikTokToken(body: URLSearchParams): Promise<TikTokTokenResponse> {
  const res = await fetch(`${TIKTOK_OPEN_API}/v2/oauth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body,
  })
  const json = await res.json() as TikTokTokenResponse
  if (!res.ok || json.error) {
    throw new TikTokOAuthTokenError(
      json.error_description || json.error || `TikTok token request failed (HTTP ${res.status})`,
      { logId: json.log_id, tiktokError: json.error },
    )
  }
  return json
}

export async function exchangeTikTokCode(origin: string, code: string): Promise<TikTokTokenResponse> {
  const redirectUri = `${origin}/api/promote/oauth/tiktok/callback`
  return postTikTokToken(new URLSearchParams({
    client_key: tiktokClientKey(),
    client_secret: tiktokClientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  }))
}

export async function refreshTikTokAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
  return postTikTokToken(new URLSearchParams({
    client_key: tiktokClientKey(),
    client_secret: tiktokClientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }))
}

export async function fetchTikTokUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const params = new URLSearchParams({
    fields: 'open_id,display_name,username',
  })
  const res = await fetch(`${TIKTOK_OPEN_API}/v2/user/info/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json() as {
    data?: { user?: { open_id?: string; display_name?: string; username?: string } }
    error?: { code?: string; message?: string; log_id?: string }
  }
  if (!res.ok || (json.error?.code && json.error.code !== 'ok')) {
    throw new TikTokOAuthUserInfoError(
      json.error?.message || `TikTok user info failed (HTTP ${res.status})`,
      { logId: json.error?.log_id, tiktokCode: json.error?.code },
    )
  }
  const user = json.data?.user
  if (!user?.open_id) throw new Error('TikTok user info missing open_id')
  return {
    openId: user.open_id,
    displayName: user.display_name?.trim() || user.username?.trim() || 'TikTok',
    username: user.username?.trim() || null,
  }
}

import { randomBytes, createHash } from 'crypto'

export const BUFFER_OAUTH_SCOPES = [
  'posts:read',
  'posts:write',
  'account:read',
  'offline_access',
].join(' ')

const PROMOTE_BUFFER_STATE_COOKIE = 'margo_promote_buffer_oauth_state'
const PROMOTE_BUFFER_VERIFIER_COOKIE = 'margo_promote_buffer_pkce_verifier'
const PROMOTE_BUFFER_RETURN_COOKIE = 'margo_promote_buffer_return'

export const PROMOTE_BUFFER_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10,
}

export {
  PROMOTE_BUFFER_STATE_COOKIE,
  PROMOTE_BUFFER_VERIFIER_COOKIE,
  PROMOTE_BUFFER_RETURN_COOKIE,
}

function bufferClientId(): string {
  const id = process.env.BUFFER_OAUTH_CLIENT_ID?.trim()
  if (!id) throw new Error('BUFFER_OAUTH_CLIENT_ID is not configured')
  return id
}

function bufferClientSecret(): string | undefined {
  return process.env.BUFFER_OAUTH_CLIENT_SECRET?.trim() || undefined
}

export function buildBufferOAuthState(): string {
  return randomBytes(24).toString('base64url')
}

export function buildBufferPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildBufferAuthorizeUrl(origin: string, state: string, codeChallenge: string): string {
  const redirectUri = `${origin}/api/promote/oauth/buffer/callback`
  const params = new URLSearchParams({
    client_id: bufferClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: BUFFER_OAUTH_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'consent',
  })
  return `https://auth.buffer.com/auth?${params.toString()}`
}

export interface BufferTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

export async function exchangeBufferCode(
  origin: string,
  code: string,
  codeVerifier: string,
): Promise<BufferTokenResponse> {
  const redirectUri = `${origin}/api/promote/oauth/buffer/callback`
  const body = new URLSearchParams({
    client_id: bufferClientId(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })
  const secret = bufferClientSecret()
  if (secret) body.set('client_secret', secret)

  const res = await fetch('https://auth.buffer.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Buffer token exchange failed: ${text}`)
  }
  return res.json() as Promise<BufferTokenResponse>
}

export async function refreshBufferAccessToken(refreshToken: string): Promise<BufferTokenResponse> {
  const body = new URLSearchParams({
    client_id: bufferClientId(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const secret = bufferClientSecret()
  if (secret) body.set('client_secret', secret)

  const res = await fetch('https://auth.buffer.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Buffer token refresh failed: ${text}`)
  }
  return res.json() as Promise<BufferTokenResponse>
}

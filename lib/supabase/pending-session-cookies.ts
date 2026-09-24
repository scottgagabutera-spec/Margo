import { NextResponse } from 'next/server'

export type PendingSessionCookie = {
  name: string
  value: string
  options: Parameters<NextResponse['cookies']['set']>[2]
}

/** Attach Supabase session Set-Cookie headers collected during a route handler. */
export function applyPendingSessionCookies(
  response: NextResponse,
  pendingCookies: PendingSessionCookie[],
  pendingHeaders: [string, string][],
) {
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  pendingHeaders.forEach(([key, value]) => {
    response.headers.set(key, value)
  })
}

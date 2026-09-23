import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { saveFacebookPageConnection } from '@/lib/promote/facebook-connection'
import { PROMOTE_FACEBOOK_PENDING_COOKIE } from '@/lib/promote/facebook-oauth'
import { decryptPromoteToken } from '@/lib/promote/token-vault'

type PendingPayload = {
  userAccessToken: string
  pages: Array<{ id: string; name: string; accessToken: string }>
}

function readPendingPages(request: NextRequest): PendingPayload | null {
  const raw = request.cookies.get(PROMOTE_FACEBOOK_PENDING_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(decryptPromoteToken(raw)) as PendingPayload
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const pending = readPendingPages(request)
  if (!pending?.pages?.length) {
    return NextResponse.json({ pages: [] })
  }

  return NextResponse.json({
    pages: pending.pages.map((p) => ({ id: p.id, name: p.name })),
  })
}

export async function POST(request: NextRequest) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { pageId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const pageId = body.pageId?.trim()
  if (!pageId) return NextResponse.json({ error: 'pageId is required' }, { status: 400 })

  const pending = readPendingPages(request)
  if (!pending?.pages?.length) {
    return NextResponse.json({ error: 'Page selection expired — connect Facebook again.' }, { status: 400 })
  }

  const page = pending.pages.find((p) => p.id === pageId)
  if (!page) return NextResponse.json({ error: 'Page not found in pending selection.' }, { status: 400 })

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  try {
    await saveFacebookPageConnection(
      admin,
      session.userId,
      { id: page.id, name: page.name, accessToken: page.accessToken },
      pending.userAccessToken,
    )
    const res = NextResponse.json({ ok: true, pageName: page.name })
    res.cookies.delete(PROMOTE_FACEBOOK_PENDING_COOKIE)
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save Facebook Page connection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

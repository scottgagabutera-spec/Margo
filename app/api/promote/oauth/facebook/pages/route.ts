import { NextResponse, type NextRequest } from 'next/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { saveFacebookPageConnection } from '@/lib/promote/facebook-connection'
import {
  clearFacebookPagePending,
  loadFacebookPagePending,
} from '@/lib/promote/facebook-page-pending'
import { PROMOTE_FACEBOOK_PENDING_COOKIE } from '@/lib/promote/facebook-oauth'
import { decryptPromoteToken } from '@/lib/promote/token-vault'

type PendingPayload = {
  userAccessToken: string
  pages: Array<{ id: string; name: string; accessToken: string }>
}

function readPendingFromCookie(request: NextRequest): PendingPayload | null {
  const raw = request.cookies.get(PROMOTE_FACEBOOK_PENDING_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(decryptPromoteToken(raw)) as PendingPayload
  } catch {
    return null
  }
}

async function readPendingPayload(
  request: NextRequest,
  profileId: string,
): Promise<PendingPayload | null> {
  const admin = getPromoteAdmin()
  if (admin) {
    const fromDb = await loadFacebookPagePending(admin, profileId)
    if (fromDb?.pages?.length) return fromDb
  }
  return readPendingFromCookie(request)
}

export async function GET(request: NextRequest) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const pending = await readPendingPayload(request, session.userId)
    if (!pending?.pages?.length) {
      return NextResponse.json({ pages: [] })
    }

    return NextResponse.json({
      pages: pending.pages.map((p) => ({ id: p.id, name: p.name })),
    })
  } catch (err) {
    console.error('[promote/facebook pages GET]', err)
    return NextResponse.json({ error: 'Could not load pages' }, { status: 500 })
  }
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

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  try {
    const pending = await readPendingPayload(request, session.userId)
    if (!pending?.pages?.length) {
      return NextResponse.json({ error: 'Page selection expired — connect Facebook again.' }, { status: 400 })
    }

    const page = pending.pages.find((p) => p.id === pageId)
    if (!page) return NextResponse.json({ error: 'Page not found in pending selection.' }, { status: 400 })

    await saveFacebookPageConnection(
      admin,
      session.userId,
      { id: page.id, name: page.name, accessToken: page.accessToken },
      pending.userAccessToken,
    )

    await clearFacebookPagePending(admin, session.userId)
    const res = NextResponse.json({ ok: true, pageName: page.name })
    res.cookies.delete(PROMOTE_FACEBOOK_PENDING_COOKIE)
    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save Facebook Page connection'
    console.error('[promote/facebook pages POST]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

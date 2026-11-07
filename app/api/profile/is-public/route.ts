import { NextRequest, NextResponse } from 'next/server'
import { isConsumerVisibleUsername } from '@/lib/profile-public-server'

/** Read-only: whether a username may appear in consumer discovery. */
export async function GET(request: NextRequest) {
  const username = (request.nextUrl.searchParams.get('username') || '').trim()
  if (!username) {
    return NextResponse.json({ visible: false }, { status: 400 })
  }
  const visible = await isConsumerVisibleUsername(username)
  return NextResponse.json({ visible })
}

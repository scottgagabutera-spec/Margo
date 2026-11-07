import { NextRequest, NextResponse } from 'next/server'
import { buildProfileSurface } from '@/lib/profile/surface-server'

const CACHE = {
  'Cache-Control': 'private, max-age=0, stale-while-revalidate=60',
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')?.trim()
  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  const surface = await buildProfileSurface(username)
  if (!surface) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: CACHE })
  }

  return NextResponse.json(surface, { headers: CACHE })
}

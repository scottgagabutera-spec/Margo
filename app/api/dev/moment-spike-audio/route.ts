import { NextResponse } from 'next/server'

/**
 * Dev-only audio proxy for the Moment video spike.
 * R2 CORS allows https://trymargo.com but not localhost — this route
 * fetches server-side so spike encode works in local dev.
 */
export async function GET() {
  const url = 'https://audio.trymargo.com/Margo/audio/Formidable.mp3'
  const res = await fetch(url)
  if (!res.ok) {
    return NextResponse.json({ error: 'Upstream audio fetch failed' }, { status: 502 })
  }
  const body = await res.arrayBuffer()
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

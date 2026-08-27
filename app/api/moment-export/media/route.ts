import { NextRequest, NextResponse } from 'next/server'
import { isAllowedExportMediaUrl } from '@/lib/moment-export/video/resolve-export-media-url'

export const runtime = 'nodejs'

/**
 * Same-origin proxy for catalog audio/artwork during video export.
 * R2 CORS allows https://trymargo.com only — preview (*.vercel.app) and
 * localhost need this to decode snippet audio in the browser.
 *
 * Only https://audio.trymargo.com/Margo/audio/* and .../artwork/* are allowed.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw || !isAllowedExportMediaUrl(raw)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const range = req.headers.get('range')
  const upstream = await fetch(raw, {
    headers: range ? { Range: range } : undefined,
    cache: 'force-cache',
  })

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: 'Upstream unavailable' },
      { status: upstream.status === 404 ? 404 : 502 },
    )
  }

  const headers = new Headers()
  const contentType = upstream.headers.get('Content-Type')
  if (contentType) headers.set('Content-Type', contentType)
  const contentLength = upstream.headers.get('Content-Length')
  if (contentLength) headers.set('Content-Length', contentLength)
  const acceptRanges = upstream.headers.get('Accept-Ranges')
  if (acceptRanges) headers.set('Accept-Ranges', acceptRanges)
  const contentRange = upstream.headers.get('Content-Range')
  if (contentRange) headers.set('Content-Range', contentRange)
  headers.set('Cache-Control', 'private, max-age=3600')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}

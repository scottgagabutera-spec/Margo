import { NextRequest, NextResponse } from 'next/server'
import { fetchArtworkForProxy } from '@/lib/export/artwork-proxy/fetch-artwork'
import { ArtworkProxyUrlError, validateArtworkProxyUrl } from '@/lib/export/artwork-proxy/validate-url'

/**
 * Same-origin artwork proxy for literal UI export only.
 * Allows html-to-image to inline remote artwork without third-party CORS.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 })
  }

  try {
    validateArtworkProxyUrl(raw)
    const { body, contentType } = await fetchArtworkForProxy(raw)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    const message = err instanceof ArtworkProxyUrlError
      ? err.message
      : 'failed to fetch artwork'
    const status = err instanceof ArtworkProxyUrlError ? 400 : 502
    return NextResponse.json({ error: message }, { status })
  }
}

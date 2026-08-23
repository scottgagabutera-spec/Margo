import {
  ARTWORK_PROXY_MAX_BYTES,
  ARTWORK_PROXY_MAX_REDIRECTS,
  ARTWORK_PROXY_TIMEOUT_MS,
  ArtworkProxyUrlError,
  normalizeImageContentType,
  validateArtworkProxyUrl,
} from '@/lib/export/artwork-proxy/validate-url'

export type FetchedArtwork = {
  body: Uint8Array
  contentType: string
}

async function readResponseWithLimit(res: Response): Promise<Uint8Array> {
  const reader = res.body?.getReader()
  if (!reader) throw new ArtworkProxyUrlError('empty response body')

  const chunks: Uint8Array[] = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > ARTWORK_PROXY_MAX_BYTES) {
      throw new ArtworkProxyUrlError(`artwork exceeds ${ARTWORK_PROXY_MAX_BYTES} bytes`)
    }
    chunks.push(value)
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

/** Fetch remote artwork bytes with redirect + size guards. */
export async function fetchArtworkForProxy(startUrl: string): Promise<FetchedArtwork> {
  let current = validateArtworkProxyUrl(startUrl).toString()
  let redirectCount = 0

  while (true) {
    const res = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(ARTWORK_PROXY_TIMEOUT_MS),
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'MargoArtworkProxy/1.0',
      },
    })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new ArtworkProxyUrlError('redirect missing location')
      redirectCount += 1
      if (redirectCount > ARTWORK_PROXY_MAX_REDIRECTS) {
        throw new ArtworkProxyUrlError('too many redirects')
      }
      current = new URL(location, current).toString()
      validateArtworkProxyUrl(current)
      continue
    }

    if (!res.ok) {
      throw new ArtworkProxyUrlError(`upstream responded ${res.status}`)
    }

    const contentType = normalizeImageContentType(res.headers.get('content-type'))
    if (!contentType) {
      throw new ArtworkProxyUrlError('upstream is not an image')
    }

    const body = await readResponseWithLimit(res)
    if (body.byteLength === 0) {
      throw new ArtworkProxyUrlError('empty image body')
    }

    return { body, contentType }
  }
}

const RETRYABLE = new Set(['Failed to fetch', 'NetworkError', 'Load failed', 'network'])

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function uploadErrorMessage(err: unknown, kind: 'audio' | 'artwork'): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (RETRYABLE.has(raw) || /failed to fetch/i.test(raw)) {
    return kind === 'audio'
      ? 'Upload could not reach storage. Check your connection and try again. If it keeps failing, try WiFi or switch networks.'
      : 'Poster upload could not reach storage. Check your connection and try again.'
  }
  if (/403|401|signature/i.test(raw)) {
    return 'Upload link expired or was rejected. Tap Save again to get a fresh link.'
  }
  if (/413|too large/i.test(raw)) {
    return kind === 'audio' ? 'Audio is too large. Use a file under 25 MB.' : 'Poster is too large. Use a file under 5 MB.'
  }
  return raw || 'Upload failed. Try again.'
}

export async function putFileToPresignedUrl(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const body = file
  const res = await fetch(url, {
    method: 'PUT',
    body,
    headers,
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
  })
  if (onProgress) onProgress(100)
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `Storage returned ${res.status}`)
  }
}

export async function putCatalogFileWithRetry(
  presign: { url: string; headers: Record<string, string> },
  file: File,
  kind: 'audio' | 'artwork',
  onProgress?: (pct: number) => void,
): Promise<void> {
  const delays = [0, 1200, 3200]
  let lastErr: unknown
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i])
    try {
      await putFileToPresignedUrl(presign.url, presign.headers, file, onProgress)
      return
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : ''
      if (!RETRYABLE.has(msg) && !/failed to fetch/i.test(msg)) break
    }
  }
  throw new Error(uploadErrorMessage(lastErr, kind))
}

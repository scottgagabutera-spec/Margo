import { putCatalogFileWithRetry } from '@/lib/r2/client-catalog-upload'

export const CATALOG_CHUNK_BYTES = 3 * 1024 * 1024
export const CATALOG_AUDIO_MAX_BYTES = 50 * 1024 * 1024

type PartRecord = { partNumber: number; etag: string }

type Session = {
  uploadId: string
  key: string
  publicUrl: string
  parts: PartRecord[]
}

function sessionKey(songId: string, kind: string, file: File) {
  return `margo.upload.${songId}.${kind}.${file.size}.${file.name}`
}

function readSession(key: string): Session | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function writeSession(key: string, session: Session | null) {
  try {
    if (!session) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(session))
  } catch {
    /* private mode */
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function withPartRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (i < attempts - 1) await sleep(800 * (i + 1))
    }
  }
  throw last
}

function userFacingUploadError(kind: 'audio' | 'artwork', step: string): string {
  if (step === 'network') {
    return kind === 'audio'
      ? 'Upload lost connection. Stay on this screen and tap Save again to continue.'
      : 'Poster upload lost connection. Tap Save again.'
  }
  if (step === 'size') {
    return 'This file is too large. Audio can be up to 50 MB.'
  }
  return 'Upload did not finish. Tap Save again or try a smaller file.'
}

export async function uploadCatalogFileResilient(opts: {
  songId: string
  kind: 'audio' | 'artwork'
  file: File
  meta: { songTitle: string; artistLabel: string }
  extension: string
  contentType: string
  onProgress?: (pct: number) => void
  tryDirectPresign: () => Promise<string>
}): Promise<string> {
  const { songId, kind, file, onProgress } = opts
  if (kind === 'audio' && file.size > CATALOG_AUDIO_MAX_BYTES) {
    throw new Error(userFacingUploadError('audio', 'size'))
  }

  try {
    const url = await opts.tryDirectPresign()
    onProgress?.(100)
    return url
  } catch {
    /* fall through to chunked */
  }

  const storageKey = sessionKey(songId, kind, file)
  let session = readSession(storageKey)

  if (!session) {
    const initRes = await fetch('/api/studio/catalog-upload/multipart/init', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId,
        kind,
        extension: opts.extension,
        contentType: opts.contentType,
        byteLength: file.size,
        songTitle: opts.meta.songTitle.trim(),
        artistLabel: opts.meta.artistLabel.trim(),
      }),
    })
    if (!initRes.ok) {
      throw new Error(userFacingUploadError(kind, 'network'))
    }
    const init = (await initRes.json()) as { uploadId: string; key: string; publicUrl: string }
    session = { uploadId: init.uploadId, key: init.key, publicUrl: init.publicUrl, parts: [] }
    writeSession(storageKey, session)
  }

  const totalParts = Math.ceil(file.size / CATALOG_CHUNK_BYTES)
  const done = new Set(session.parts.map((p) => p.partNumber))

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    if (done.has(partNumber)) {
      onProgress?.(Math.round((partNumber / totalParts) * 100))
      continue
    }
    const start = (partNumber - 1) * CATALOG_CHUNK_BYTES
    const end = Math.min(start + CATALOG_CHUNK_BYTES, file.size)
    const chunk = file.slice(start, end)
    const fd = new FormData()
    fd.append('chunk', chunk)
    fd.append('uploadId', session.uploadId)
    fd.append('key', session.key)
    fd.append('partNumber', String(partNumber))

    const etag = await withPartRetry(async () => {
      const res = await fetch('/api/studio/catalog-upload/multipart/part', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) throw new Error('part failed')
      const j = (await res.json()) as { etag: string }
      return j.etag
    })

    session.parts.push({ partNumber, etag })
    writeSession(storageKey, session)
    onProgress?.(Math.round((partNumber / totalParts) * 100))
  }

  const completeRes = await fetch('/api/studio/catalog-upload/multipart/complete', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId: session.uploadId,
      key: session.key,
      parts: session.parts,
    }),
  })
  if (!completeRes.ok) {
    throw new Error(userFacingUploadError(kind, 'network'))
  }
  const out = (await completeRes.json()) as { publicUrl: string }
  writeSession(storageKey, null)
  onProgress?.(100)
  return out.publicUrl
}

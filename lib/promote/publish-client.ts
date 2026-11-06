import type { MargoMoment } from '@/lib/moment/types'
import { getOrCreateMomentVideoFile } from '@/lib/moment-export/save-moment-video'
import { readPromoteResponse } from '@/lib/promote/publish-error'
import { getBrowserAccessToken } from '@/lib/supabase/client'
import { shortId8FromUuid } from '@/lib/r2/r2-object-naming'

function sessionUserIdFromMemoryToken(): string | null {
  const token = getBrowserAccessToken()
  if (!token) return null
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    const json = JSON.parse(atob(normalized + pad)) as { sub?: unknown }
    return typeof json.sub === 'string' ? json.sub : null
  } catch {
    return null
  }
}

export async function publishQueueMomentVideo(
  queueId: string,
  moment: MargoMoment,
  onProgress?: (message: string) => void,
  signal?: AbortSignal,
): Promise<{ videoUrl: string; videoId: string }> {
  if (signal?.aborted) throw new DOMException('Publish cancelled', 'AbortError')

  const rendered = await getOrCreateMomentVideoFile(moment, onProgress, signal)
  if (!rendered) throw new Error('Video export is not available on this device')

  const byteSize = rendered.file.size
  if (byteSize <= 0) {
    throw new Error('Rendered MP4 is empty — encode produced no video bytes')
  }

  onProgress?.(`Uploading video (${Math.max(1, Math.round(byteSize / (1024 * 1024)))} MB)…`)

  const userId = sessionUserIdFromMemoryToken()
  if (!userId) throw new Error('You must be signed in to publish')

  let presigned: {
    url: string
    headers: Record<string, string>
    key: string
    expiresAt: string
    maxBytes: number
  }
  try {
    const presignRes = await fetch(`/api/promote/queue/${queueId}/stage-upload-url`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!presignRes.ok) {
      let detail = presignRes.statusText
      try {
        const j = (await presignRes.json()) as { error?: string }
        if (j.error) detail = j.error
      } catch { /* ignore */ }
      throw new Error(detail || 'Could not get upload URL')
    }
    presigned = (await presignRes.json()) as typeof presigned
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Could not get upload URL')
  }

  const uid8 = shortId8FromUuid(userId)
  const legacyPrefix = `Margo/promote/staging/${userId}/`
  const looksLegacy = presigned.key.startsWith(legacyPrefix)
  const looksReadable =
    presigned.key.startsWith('Margo/promote/staging/')
    && presigned.key.includes(`-${uid8}/`)
  if (
    !presigned.key.endsWith('.mp4')
    || (!looksLegacy && !looksReadable)
  ) {
    throw new Error('Upload URL key mismatch — try again')
  }
  if (byteSize > presigned.maxBytes) {
    throw new Error(`Video is too large (max ${Math.round(presigned.maxBytes / (1024 * 1024))} MB)`)
  }

  const putRes = await fetch(presigned.url, {
    method: 'PUT',
    body: rendered.file,
    headers: presigned.headers,
    signal,
  })
  if (!putRes.ok) {
    throw new Error(`Could not upload video to storage: ${putRes.status} ${putRes.statusText}`)
  }

  onProgress?.('Publishing to connected platforms…')
  if (signal?.aborted) throw new DOMException('Publish cancelled', 'AbortError')

  let res: Response
  try {
    res = await fetch(`/api/promote/queue/${queueId}/publish`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagingKey: presigned.key }),
      signal,
    })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    throw new Error(
      `Publish request never completed: ${err instanceof Error ? err.message : 'network error'}. ` +
      'Publish was not completed.',
    )
  }

  const result = await readPromoteResponse(res)
  if (!result.ok) throw new Error(result.error)

  const videoUrl = typeof result.body.videoUrl === 'string' ? result.body.videoUrl : ''
  const videoId = typeof result.body.videoId === 'string' ? result.body.videoId : ''
  if (!videoUrl || !videoId) {
    throw new Error('Publish succeeded but the response was missing videoUrl/videoId')
  }
  return { videoUrl, videoId }
}

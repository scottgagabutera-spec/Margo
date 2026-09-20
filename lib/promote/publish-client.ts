import type { MargoMoment } from '@/lib/moment/types'
import { getOrCreateMomentVideoFile } from '@/lib/moment-export/save-moment-video'
import { readPromoteResponse } from '@/lib/promote/publish-error'
import { createClient, getBrowserAccessToken } from '@/lib/supabase/client'

const PROMOTE_STAGING_BUCKET = 'song-audio'

function promoteStagingPath(userId: string, queueId: string): string {
  return `${userId}/promote/${queueId}.mp4`
}

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
): Promise<{ videoUrl: string; videoId: string }> {
  const rendered = await getOrCreateMomentVideoFile(moment, onProgress)
  if (!rendered) throw new Error('Video export is not available on this device')

  const byteSize = rendered.file.size
  if (byteSize <= 0) {
    throw new Error('Rendered MP4 is empty — encode produced no video bytes')
  }

  onProgress?.(`Uploading video (${Math.max(1, Math.round(byteSize / (1024 * 1024)))} MB)…`)

  const userId = sessionUserIdFromMemoryToken()
  if (!userId) throw new Error('You must be signed in to publish')

  const supabase = createClient()
  const storagePath = promoteStagingPath(userId, queueId)
  const { error: uploadErr } = await supabase.storage
    .from(PROMOTE_STAGING_BUCKET)
    .upload(storagePath, rendered.file, {
      contentType: 'video/mp4',
      upsert: true,
    })
  if (uploadErr) {
    throw new Error(`Could not stage video for publish: ${uploadErr.message}`)
  }

  onProgress?.('Publishing to YouTube…')

  let res: Response
  try {
    res = await fetch(`/api/promote/queue/${queueId}/publish`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath }),
    })
  } catch (err) {
    throw new Error(
      `Publish request never completed: ${err instanceof Error ? err.message : 'network error'}. ` +
      'YouTube was not called.',
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

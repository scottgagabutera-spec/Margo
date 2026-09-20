import type { MargoMoment } from '@/lib/moment/types'
import { getOrCreateMomentVideoFile } from '@/lib/moment-export/save-moment-video'

export async function publishQueueMomentVideo(
  queueId: string,
  moment: MargoMoment,
  onProgress?: (message: string) => void,
): Promise<{ videoUrl: string; videoId: string }> {
  const rendered = await getOrCreateMomentVideoFile(moment, onProgress)
  if (!rendered) throw new Error('Video export is not available on this device')

  const form = new FormData()
  form.append('video', rendered.file, rendered.file.name || 'margo-moment.mp4')

  const res = await fetch(`/api/promote/queue/${queueId}/publish`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || 'Publish failed')
  }
  return { videoUrl: body.videoUrl, videoId: body.videoId }
}

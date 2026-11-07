import type { MemoryPhotoInput } from '@/lib/memory/types'

export const MAX_MEMORY_MEDIA = 10
export const MAX_VIDEO_SEC = 60

export type MemoryDraftPhoto = MemoryPhotoInput & {
  previewUrl: string
  mediaType: 'image' | 'video'
  durationSec?: number
}

async function encodeImageWebp(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const maxEdge = 1600
  let w = bitmap.width
  let h = bitmap.height
  if (w > maxEdge || h > maxEdge) {
    const scale = maxEdge / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/webp', 0.86)
  })
  return { blob, width: w, height: h }
}

async function readVideoMeta(file: File): Promise<{ durationSec: number; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.src = url
      v.onloadedmetadata = () => {
        if (!Number.isFinite(v.duration) || v.duration > MAX_VIDEO_SEC + 0.25) {
          reject(new Error(`Video must be ${MAX_VIDEO_SEC} seconds or shorter`))
          return
        }
        resolve({ durationSec: v.duration, width: v.videoWidth, height: v.videoHeight })
      }
      v.onerror = () => reject(new Error('Could not read video'))
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function captureVideoPoster(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const v = document.createElement('video')
      v.preload = 'auto'
      v.muted = true
      v.playsInline = true
      v.src = url
      v.onloadeddata = () => {
        v.currentTime = Math.min(0.12, v.duration * 0.08)
      }
      v.onseeked = () => {
        const w = v.videoWidth
        const h = v.videoHeight
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not capture poster'))
          return
        }
        ctx.drawImage(v, 0, 0, w, h)
        canvas.toBlob(
          (b) => (b ? resolve({ blob: b, width: w, height: h }) : reject(new Error('Could not encode poster'))),
          'image/webp',
          0.86,
        )
      }
      v.onerror = () => reject(new Error('Could not load video for poster'))
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function putToPresignedUrl(
  presign: { url: string; headers: Record<string, string> },
  body: Blob,
): Promise<void> {
  const res = await fetch(presign.url, { method: 'PUT', headers: presign.headers, body })
  if (!res.ok) throw new Error('Upload failed')
}

export async function uploadMemoryMediaFile(
  draftOrMemoryId: string,
  file: File,
  position: number,
  onStatus?: (msg: string) => void,
): Promise<MemoryDraftPhoto> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name)
  if (isVideo) {
    if (file.size > 50 * 1024 * 1024) throw new Error('Video must be under 50 MB')
    const contentType = file.type || (file.name.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4')
    const { durationSec, width, height } = await readVideoMeta(file)
    onStatus?.('Uploading poster…')
    const poster = await captureVideoPoster(file)
    const posterPresignRes = await fetch('/api/memories/photo-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draftId: draftOrMemoryId,
        position,
        contentType: 'image/webp',
        byteLength: poster.blob.size,
        kind: 'poster',
      }),
    })
    if (!posterPresignRes.ok) {
      const err = await posterPresignRes.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Poster upload failed')
    }
    const posterPresign = (await posterPresignRes.json()) as {
      url: string
      headers: Record<string, string>
      key: string
      publicUrl: string
    }
    await putToPresignedUrl(posterPresign, poster.blob)

    onStatus?.('Uploading video…')
    const videoPresignRes = await fetch('/api/memories/photo-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draftId: draftOrMemoryId,
        position,
        contentType,
        byteLength: file.size,
        kind: 'video',
      }),
    })
    if (!videoPresignRes.ok) {
      const err = await videoPresignRes.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || 'Video upload failed')
    }
    const videoPresign = (await videoPresignRes.json()) as {
      url: string
      headers: Record<string, string>
      key: string
      publicUrl: string
    }
    await putToPresignedUrl(videoPresign, file)
    return {
      position,
      r2Key: videoPresign.key,
      previewUrl: posterPresign.publicUrl,
      width,
      height,
      mediaType: 'video',
      durationSec,
    }
  }

  const { blob, width, height } = await encodeImageWebp(file)
  onStatus?.('Uploading photo…')
  const presignRes = await fetch('/api/memories/photo-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      draftId: draftOrMemoryId,
      position,
      contentType: 'image/webp',
      byteLength: blob.size,
      kind: 'image',
    }),
  })
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || 'Upload failed')
  }
  const presign = (await presignRes.json()) as {
    url: string
    headers: Record<string, string>
    key: string
    publicUrl: string
  }
  await putToPresignedUrl(presign, blob)
  return {
    position,
    r2Key: presign.key,
    previewUrl: presign.publicUrl,
    width,
    height,
    mediaType: 'image',
  }
}

export function reorderMemoryPhotos(photos: MemoryDraftPhoto[]): MemoryDraftPhoto[] {
  return photos.map((p, i) => ({ ...p, position: i }))
}

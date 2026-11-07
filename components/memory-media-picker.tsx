'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  MAX_MEMORY_MEDIA,
  reorderMemoryPhotos,
  uploadMemoryMediaFile,
  type MemoryDraftPhoto,
} from '@/lib/memory/client-media-upload'
import { UI_FONT, TYPE } from '@/lib/fonts'

const font = UI_FONT

export function MemoryMediaPicker({
  draftOrMemoryId,
  photos,
  onChange,
}: {
  draftOrMemoryId: string
  photos: MemoryDraftPhoto[]
  onChange: (next: MemoryDraftPhoto[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFile = async (file: File) => {
    if (photos.length >= MAX_MEMORY_MEDIA || uploading) return
    setUploading(true)
    try {
      const next = await uploadMemoryMediaFile(draftOrMemoryId, file, photos.length, setStatus)
      onChange(reorderMemoryPhotos([...photos, next]))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add media')
    } finally {
      setUploading(false)
      setStatus(null)
    }
  }

  const remove = (r2Key: string) => {
    onChange(reorderMemoryPhotos(photos.filter((p) => p.r2Key !== r2Key)))
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = [...photos]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    onChange(reorderMemoryPhotos(next))
  }

  return (
    <div className="margo-memory-media-picker">
      <div className="margo-memory-media-picker__head">
        <p className="margo-memory-media-picker__title" style={{ fontFamily: font }}>
          Add photos and videos
        </p>
        <span style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--text-muted)' }}>
          {photos.length}/{MAX_MEMORY_MEDIA}
        </span>
      </div>
      <p className="margo-memory-media-picker__hint" style={{ fontFamily: font }}>
        First item is the cover. Photos and short videos (up to 60s). Stored in your private R2 folder.
      </p>
      {status ? (
        <p style={{ fontFamily: font, fontSize: TYPE.meta, color: 'var(--gold)', margin: '0 0 8px' }}>{status}</p>
      ) : null}
      <div className="margo-memory-media-picker__grid">
        {photos.map((p, index) => (
          <div
            key={p.r2Key}
            className={`margo-memory-media-picker__thumb${index === 0 ? ' margo-memory-media-picker__thumb--cover' : ''}`}
          >
            <img src={p.previewUrl} alt="" />
            {p.mediaType === 'video' ? (
              <span
                style={{
                  position: 'absolute',
                  left: 4,
                  bottom: 4,
                  fontSize: 9,
                  padding: '2px 4px',
                  borderRadius: 4,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                }}
              >
                Video
              </span>
            ) : null}
            <div className="margo-memory-media-picker__toolbar">
              {index > 0 ? (
                <button type="button" className="margo-memory-media-picker__icon-btn" aria-label="Move earlier" onClick={() => move(index, -1)}>
                  ‹
                </button>
              ) : null}
              {index < photos.length - 1 ? (
                <button type="button" className="margo-memory-media-picker__icon-btn" aria-label="Move later" onClick={() => move(index, 1)}>
                  ›
                </button>
              ) : null}
              <button type="button" className="margo-memory-media-picker__icon-btn" aria-label="Remove" onClick={() => remove(p.r2Key)}>
                ×
              </button>
            </div>
          </div>
        ))}
        {photos.length < MAX_MEDIA ? (
          <button
            type="button"
            className="margo-memory-media-picker__add"
            disabled={uploading}
            aria-label="Add photo or video"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? '…' : '+'}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void addFile(f)
        }}
      />
    </div>
  )
}

const MAX_MEDIA = MAX_MEMORY_MEDIA

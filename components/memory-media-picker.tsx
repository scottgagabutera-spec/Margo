'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MemoryMediaSourceSheet } from '@/components/memory-media-source-sheet'
import { PortraitAvatarCropSheet } from '@/components/portrait-avatar-crop-sheet'
import { CloseIcon, PlayIcon } from '@/components/icons'
import {
  MAX_MEMORY_MEDIA,
  reorderMemoryPhotos,
  uploadMemoryMediaFile,
  type MemoryDraftPhoto,
} from '@/lib/memory/client-media-upload'

function formatVideoLength(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return ''
  const total = Math.max(0, Math.floor(sec))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

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

  return (
    <div className="margo-memory-media-picker">
      <div className="margo-memory-media-picker__head">
        <p className="margo-memory-media-picker__title">Photos or videos</p>
        <span className="margo-memory-media-picker__count">
          {photos.length}/{MAX_MEMORY_MEDIA}
        </span>
      </div>
      {status ? <p className="margo-memory-media-picker__status">{status}</p> : null}
      <div className="margo-memory-media-picker__grid">
        {photos.map((p) => (
          <div key={p.r2Key} className="margo-memory-media-picker__thumb">
            <img src={p.previewUrl} alt="" />
            {p.mediaType === 'video' ? (
              <span className="margo-memory-media-picker__video-badge">
                <PlayIcon size={10} color="#fff" />
                {formatVideoLength(p.durationSec)}
              </span>
            ) : null}
            <button
              type="button"
              className="margo-memory-media-picker__remove"
              aria-label="Remove"
              onClick={() => remove(p.r2Key)}
            >
              <CloseIcon size={12} color="#fff" />
            </button>
          </div>
        ))}
        {photos.length < MAX_MEMORY_MEDIA ? (
          <button
            type="button"
            className="margo-memory-media-picker__add"
            disabled={uploading}
            aria-label="Add photo or video"
            onClick={() => setSheetOpen(true)}
          >
            {uploading ? '…' : '+'}
          </button>
        ) : null}
      </div>
      <MemoryMediaSourceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onFile={(file) => {
          const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name)
          if (isVideo) {
            void addFile(file)
            return
          }
          setCropFile(file)
          setCropOpen(true)
        }}
      />
      <PortraitAvatarCropSheet
        open={cropOpen}
        onOpenChange={setCropOpen}
        file={cropFile}
        onConfirm={(cropped) => {
          setCropOpen(false)
          setCropFile(null)
          void addFile(cropped)
        }}
      />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { cropImageToPortraitFile } from '@/lib/portrait-avatar-crop'
import { MargoMemoryCenteredDialog } from '@/components/margo-memory-centered-dialog'

export function PortraitAvatarCropSheet({
  open,
  onOpenChange,
  file,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  onConfirm: (cropped: File) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [verticalFocus, setVerticalFocus] = useState(35)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setVerticalFocus(35)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const save = async () => {
    if (!file) return
    setBusy(true)
    try {
      const cropped = await cropImageToPortraitFile(file, verticalFocus)
      onConfirm(cropped)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open || !previewUrl) return null

  return (
    <MargoMemoryCenteredDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust photo"
      titleId="portrait-crop-title"
      widthPx={300}
    >
      <p className="margo-memory-type-muted margo-memory-adjust-photo__hint">
        Portrait 4:5. Move the slider up or down.
      </p>
      <div className="margo-memory-adjust-photo__preview-wrap">
        <div className="margo-memory-adjust-photo__preview">
          <img
            src={previewUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: `50% ${verticalFocus}%`,
              display: 'block',
            }}
          />
        </div>
        <label className="margo-memory-adjust-photo__slider-label">
          <input
            type="range"
            className="margo-memory-adjust-photo__slider"
            min={0}
            max={100}
            value={verticalFocus}
            onChange={(e) => setVerticalFocus(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="margo-memory-adjust-photo__actions">
        <button type="button" className="margo-memory-btn margo-memory-btn--secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="margo-memory-btn margo-memory-btn--primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? 'Saving…' : 'Use photo'}
        </button>
      </div>
    </MargoMemoryCenteredDialog>
  )
}

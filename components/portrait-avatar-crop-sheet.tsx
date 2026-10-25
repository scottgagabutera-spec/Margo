'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cropImageToPortraitFile } from '@/lib/portrait-avatar-crop'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

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

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

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

  if (!open || !mounted || !previewUrl) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-labelledby="portrait-crop-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 240,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onOpenChange(false)}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'var(--margo-scrim)',
        }}
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--bg)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
          border: '1px solid var(--border)',
        }}
      >
        <h2 id="portrait-crop-title" style={{ fontFamily: font, fontSize: TYPE.body, fontWeight: 600, margin: '0 0 4px' }}>
          Frame your photo
        </h2>
        <p style={{ fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Portrait 4:5 — adjust vertical position, then save.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '160px',
              height: '200px',
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid var(--gold)',
              boxSizing: 'border-box',
              background: 'var(--surface-2)',
            }}
          >
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
          <label style={{ width: '100%', fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-muted)' }}>
            Vertical position
            <input
              type="range"
              min={0}
              max={100}
              value={verticalFocus}
              onChange={(e) => setVerticalFocus(Number(e.target.value))}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            style={{
              flex: 1,
              minHeight: 'var(--margo-touch-min)',
              borderRadius: '50px',
              border: 'none',
              background: 'var(--gold)',
              color: 'var(--bg)',
              fontFamily: font,
              fontWeight: 700,
              fontSize: TYPE.label,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? 'Saving…' : 'Use portrait'}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              minHeight: 'var(--margo-touch-min)',
              padding: '0 18px',
              borderRadius: '50px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontFamily: font,
              fontWeight: 600,
              fontSize: TYPE.label,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

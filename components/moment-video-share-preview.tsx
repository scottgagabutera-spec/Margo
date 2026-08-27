'use client'

import { useEffect, useRef } from 'react'

interface MomentVideoSharePreviewProps {
  open: boolean
  previewUrl: string | null
  filename: string
  busy?: boolean
  onShare: () => void
  onClose: () => void
}

const font = 'var(--font-lora), serif'

export function MomentVideoSharePreview({
  open,
  previewUrl,
  filename,
  busy = false,
  onShare,
  onClose,
}: MomentVideoSharePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!open || !previewUrl || !videoRef.current) return
    const video = videoRef.current
    video.load()
    void video.play().catch(() => {})
  }, [open, previewUrl])

  if (!open || !previewUrl) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Preview Moment video before sharing"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(7,6,10,0.72)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '360px',
          borderRadius: '16px',
          background: 'var(--surface, #121018)',
          border: '1px solid var(--border-hi)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{
          margin: 0,
          fontFamily: font,
          fontSize: '0.72rem',
          fontStyle: 'italic',
          color: 'var(--text)',
          textAlign: 'center',
        }}>
          Preview your Moment
        </p>
        <video
          ref={videoRef}
          src={previewUrl}
          controls
          playsInline
          style={{
            width: '100%',
            borderRadius: '12px',
            display: 'block',
            background: '#07060A',
          }}
        />
        <p style={{
          margin: 0,
          fontFamily: font,
          fontSize: '0.58rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          {filename}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={secondaryBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onShare}
            disabled={busy}
            style={primaryBtn}
          >
            {busy ? 'Sharing…' : 'Share video'}
          </button>
        </div>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  flex: 1,
  minHeight: '40px',
  borderRadius: '50px',
  border: 'none',
  background: 'var(--gold)',
  color: 'var(--bg)',
  fontFamily: font,
  fontSize: '0.56rem',
  fontWeight: 700,
  letterSpacing: '0.9px',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  minHeight: '40px',
  borderRadius: '50px',
  border: '1px solid var(--border-hi)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text)',
  fontFamily: font,
  fontSize: '0.56rem',
  fontWeight: 700,
  letterSpacing: '0.9px',
  textTransform: 'uppercase',
  cursor: 'pointer',
}

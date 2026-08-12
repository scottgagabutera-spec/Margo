'use client'

import { useEffect } from 'react'
import { CloseIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

type ProfileImageLightboxProps = {
  open: boolean
  onClose: () => void
  src: string
  alt: string
}

/** Full-bleed avatar/cover viewer — Mode A overlay (covers chrome). */
export function ProfileImageLightbox({ open, onClose, src, alt }: ProfileImageLightboxProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'var(--margo-scrim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingBottom: 'calc(24px + var(--margo-safe-bottom))',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 'calc(12px + env(safe-area-inset-top, 0px))',
          right: '16px',
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          borderRadius: '50%',
          border: '1px solid var(--border-hi)',
          background: 'rgba(255,255,255,0.06)',
          color: 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 1,
        }}
      >
        <CloseIcon size={18} color="currentColor" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: 'min(85dvh, 100%)',
          objectFit: 'contain',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
        }}
      />
      <p style={{
        position: 'absolute',
        bottom: 'calc(16px + var(--margo-safe-bottom))',
        left: 0,
        right: 0,
        textAlign: 'center',
        margin: 0,
        fontFamily: UI_FONT,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        pointerEvents: 'none',
      }}>
        Tap outside to close
      </p>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { UI_FONT } from '@/lib/fonts'

export function FoundingListenerSheet({
  open,
  onClose,
  displayName,
}: {
  open: boolean
  onClose: () => void
  displayName?: string | null
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 320,
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'rgba(7, 6, 10, 0.88)',
          cursor: 'default',
        }}
      />
      <div
        role="dialog"
        aria-labelledby="founding-listener-title"
        aria-modal="true"
        style={{
          position: 'fixed',
          left: '50%',
          top: '44%',
          transform: 'translate(-50%, -50%)',
          zIndex: 321,
          textAlign: 'center',
          padding: '8px 24px',
          maxWidth: 'min(320px, 88vw)',
          pointerEvents: 'none',
        }}
      >
        <p
          id="founding-listener-title"
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            margin: 0,
          }}
        >
          Founding Listener
        </p>
        {displayName ? (
          <p
            style={{
              fontFamily: UI_FONT,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text)',
              margin: '10px 0 0',
            }}
          >
            {displayName}
          </p>
        ) : null}
        <p
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.8rem',
            lineHeight: 1.45,
            color: 'var(--text-muted)',
            margin: '12px 0 0',
          }}
        >
          Here before profile pages. Their lyrics still live on the feed.
        </p>
      </div>
    </>,
    document.body,
  )
}

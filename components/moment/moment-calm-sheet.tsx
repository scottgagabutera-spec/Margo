'use client'

import type { ReactNode } from 'react'
import { CloseIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function MomentCalmSheet({ open, title, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="margo-calm-sheet-host">
      <div
        className="margo-calm-sheet__backdrop"
        role="presentation"
        onClick={onClose}
      />
      <div className="margo-calm-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2
          className="margo-calm-sheet__title"
          style={{ fontFamily: UI_FONT }}
        >
          {title}
        </h2>
        <button
          type="button"
          className="margo-calm-sheet__close"
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon size={18} color="var(--text-secondary)" />
        </button>
        <div className="margo-calm-sheet__body">{children}</div>
      </div>
    </div>
  )
}

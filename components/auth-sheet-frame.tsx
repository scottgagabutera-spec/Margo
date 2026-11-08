'use client'

import type { ReactNode } from 'react'
import { CloseIcon } from '@/components/icons'
import './auth-sheet.css'

export function AuthSheetScrim({
  children,
  onScrimClick,
  className,
}: {
  children: ReactNode
  onScrimClick?: () => void
  className?: string
}) {
  return (
    <div
      role="presentation"
      className={className ?? 'margo-auth-sheet-scrim'}
      onClick={onScrimClick}
      onKeyDown={undefined}
    >
      {children}
    </div>
  )
}

export function AuthSheetCard({
  children,
  onClose,
  'aria-label': ariaLabel = 'Sign in',
}: {
  children: ReactNode
  onClose?: () => void
  'aria-label'?: string
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="margo-auth-sheet-card"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={undefined}
    >
      {onClose ? (
        <button type="button" className="margo-auth-sheet-close" aria-label="Close" onClick={onClose}>
          <CloseIcon size={14} color="var(--gold)" />
        </button>
      ) : null}
      {children}
    </div>
  )
}

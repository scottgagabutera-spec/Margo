'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

type Align = 'left' | 'format' | 'right'

export function LandingComposerPopoverBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="margo-landing-popover-catcher"
      aria-label="Close menu"
      tabIndex={-1}
      onClick={onClose}
    />
  )
}

export function LandingComposerPopover({
  open,
  align,
  onClose,
  children,
  className = '',
}: {
  open: boolean
  align: Align
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <LandingComposerPopoverBackdrop onClose={onClose} />
      <div
        className={`margo-landing-popover margo-landing-popover--${align} ${className}`.trim()}
        role="dialog"
        aria-modal="false"
      >
        {children}
      </div>
    </>
  )
}

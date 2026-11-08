'use client'

import { X } from 'lucide-react'

export function LandingComposerClose({
  onClose,
  label = 'Close',
}: {
  onClose: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      className="margo-landing-composer-back margo-landing-composer-back--sm"
      aria-label={label}
      onClick={onClose}
      onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
    >
      <X size={16} strokeWidth={1.75} aria-hidden />
    </button>
  )
}

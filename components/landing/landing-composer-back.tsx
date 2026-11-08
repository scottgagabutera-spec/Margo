'use client'

import { ArrowLeft } from 'lucide-react'

export function LandingComposerBack({
  onBack,
  label = 'Back',
  size = 'md',
}: {
  onBack: () => void
  label?: string
  size?: 'md' | 'sm'
}) {
  return (
    <button
      type="button"
      className={`margo-landing-composer-back${size === 'sm' ? ' margo-landing-composer-back--sm' : ''}`}
      aria-label={label}
      onClick={onBack}
      onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
    >
      <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
    </button>
  )
}

'use client'

import { ArrowLeft } from 'lucide-react'

export function LandingComposerBack({ onBack, label = 'Back' }: { onBack: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="margo-landing-composer-back"
      aria-label={label}
      onClick={onBack}
      onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
    >
      <ArrowLeft size={18} strokeWidth={1.75} aria-hidden />
    </button>
  )
}

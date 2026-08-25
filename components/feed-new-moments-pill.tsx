'use client'

import { ChevronUpIcon } from '@/components/icons/chevron-up-icon'

const font = 'var(--font-lora), serif'

interface FeedNewMomentsPillProps {
  count: number
  onReveal: () => void
  /** inline = below search bar; fixed = legacy floating (unused on Feed) */
  variant?: 'inline' | 'fixed'
}

/**
 * Compact floating control when new Moments arrive while the user is on Feed.
 * Buffered via useNewItemsBuffer — tap merges pending posts and scrolls to top.
 */
export function FeedNewMomentsPill({ count, onReveal, variant = 'fixed' }: FeedNewMomentsPillProps) {
  if (count <= 0) return null

  const label =
    count === 1 ? '1 new Moment' : `${count} new Moments`

  const isInline = variant === 'inline'

  return (
    <button
      type="button"
      onClick={onReveal}
      role="status"
      aria-live="polite"
      aria-label={`Show ${label}`}
      style={{
        position: isInline ? 'relative' : 'fixed',
        top: isInline ? undefined : 'calc(var(--nav-height, 72px) + 8px)',
        left: isInline ? undefined : '50%',
        transform: isInline ? undefined : 'translateX(-50%)',
        zIndex: isInline ? undefined : 45,
        minHeight: isInline ? '36px' : 'var(--margo-touch-min)',
        padding: isInline ? '0 12px' : '0 14px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        boxSizing: 'border-box',
        background: isInline
          ? 'linear-gradient(135deg, rgba(232,197,71,0.14), rgba(232,197,71,0.06))'
          : 'color-mix(in srgb, var(--bg) 82%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--gold)',
        border: '1px solid var(--gold-border)',
        borderRadius: '50px',
        fontFamily: font,
        fontWeight: 700,
        fontSize: isInline ? '0.54rem' : '0.58rem',
        letterSpacing: '1.1px',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: isInline ? '0 2px 12px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0, 0, 0, 0.35)',
        animation: 'fadeInUp 220ms var(--ease-out) both',
      }}
    >
      <ChevronUpIcon size={12} color="var(--gold)" />
      {label}
    </button>
  )
}

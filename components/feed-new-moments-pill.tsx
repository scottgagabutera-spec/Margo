'use client'

import { ChevronUpIcon } from '@/components/icons/chevron-up-icon'

const font = 'var(--font-lora), serif'

interface FeedNewMomentsPillProps {
  count: number
  onReveal: () => void
}

/**
 * Compact floating control when new Moments arrive while the user is on Feed.
 * Buffered via useNewItemsBuffer — tap merges pending posts and scrolls to top.
 */
export function FeedNewMomentsPill({ count, onReveal }: FeedNewMomentsPillProps) {
  if (count <= 0) return null

  const label =
    count === 1 ? '1 new Moment' : `${count} new Moments`

  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label={`Show ${label}`}
      style={{
        position: 'fixed',
        top: 'calc(var(--nav-height, 72px) + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        minHeight: '36px',
        padding: '0 14px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        boxSizing: 'border-box',
        background: 'rgba(7, 6, 10, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--gold)',
        border: '1px solid var(--gold-border)',
        borderRadius: '50px',
        fontFamily: font,
        fontWeight: 700,
        fontSize: '0.58rem',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        animation: 'fadeInUp 220ms var(--ease-out) both',
      }}
    >
      <ChevronUpIcon size={12} color="var(--gold)" />
      {label}
    </button>
  )
}

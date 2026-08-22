'use client'

import { ChevronUpIcon } from '@/components/icons/chevron-up-icon'

const font = 'var(--font-lora), serif'

interface NewItemsPillProps {
  count: number
  onReveal: () => void
  /** Brand voice label — default "new lyrics" for Feed / Discover. */
  noun?: string
}

/**
 * Sticky "Show N …" control — X/Twitter timeline pattern, Margo tokens.
 * Quiet badge language (matches Feed EarnedTag), not primary-CTA weight.
 * Used on Discover; Feed uses FeedNewMomentsPill instead.
 */
export function NewItemsPill({ count, onReveal, noun = 'new lyrics' }: NewItemsPillProps) {
  if (count <= 0) return null

  const label = count === 1 ? `Show 1 ${noun.replace(/s$/, '')}` : `Show ${count} ${noun}`

  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label={label}
      style={{
        position: 'fixed',
        top: 'calc(var(--nav-height, 72px) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        minHeight: 'var(--margo-touch-min)',
        padding: '0 16px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        boxSizing: 'border-box',
        /* Feed EarnedTag recipe: gold-tint fill, thin gold border, gold type — not solid CTA gold */
        background: 'rgba(232,197,71,0.1)',
        color: 'var(--gold)',
        border: '1px solid var(--gold-border)',
        borderRadius: '50px',
        fontFamily: font,
        fontWeight: 700,
        fontSize: '0.6rem',
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: 'none',
        animation: 'fadeInUp 280ms var(--ease-out) both',
      }}
    >
      <ChevronUpIcon size={14} color="var(--gold)" />
      {label}
    </button>
  )
}

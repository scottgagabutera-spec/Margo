'use client'

const font = 'var(--font-lora), serif'

interface NewItemsPillProps {
  count: number
  onReveal: () => void
  /** Brand voice label — default "new lyrics" for Feed / Discover. */
  noun?: string
}

/**
 * Sticky "Show N …" control — X/Twitter timeline pattern, Margo tokens.
 * Shared by Feed and Discover; keep list buffering in useNewItemsBuffer.
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
        padding: '0 18px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxSizing: 'border-box',
        background: 'var(--gold)',
        color: 'var(--text-on-gold, var(--bg))',
        border: 'none',
        borderRadius: '50px',
        fontFamily: font,
        fontWeight: 700,
        fontSize: '0.6rem',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
        animation: 'fadeInUp 280ms var(--ease-out) both',
      }}
    >
      {label}
    </button>
  )
}

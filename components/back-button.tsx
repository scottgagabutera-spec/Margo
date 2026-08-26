'use client'
import { useRouter } from 'next/navigation'

const font = 'var(--font-lora), serif'

/**
 * In-app back for depth routes. When `fallbackHref` is set it is the logical
 * parent (e.g. thread → /messages), not browser history. Device/browser back
 * is unchanged — this button never calls router.back().
 */
export function BackButton({ fallbackHref, label = 'Back' }: { fallbackHref?: string; label?: string }) {
  const router = useRouter()

  const handleBack = () => {
    if (fallbackHref) {
      router.push(fallbackHref)
    } else {
      router.push('/feed')
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
        padding: '0 12px', marginLeft: '-12px',
        background: 'none', border: 'none', cursor: 'pointer',
        boxSizing: 'border-box', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8l5 5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{
        fontFamily: font, fontSize: '0.75rem', fontWeight: 600,
        letterSpacing: '1.5px', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.7)',
      }}>
        {label}
      </span>
    </button>
  )
}
'use client'
import { useRouter } from 'next/navigation'

const font = 'var(--font-lora), serif'

function historyCanGoBack(): boolean {
  if (typeof window === 'undefined') return false
  const idx = (window.history.state as { idx?: number } | null)?.idx
  if (typeof idx === 'number') return idx > 0
  return false
}

/**
 * In-app back for depth routes. `fallbackHref` is the logical parent when
 * there is no in-app history (deep link, notification). Device/browser back
 * is unchanged.
 *
 * History is the default: Back follows the previous step. Pass
 * `preferHistory={false}` to always use `fallbackHref` (Studio → profile).
 *
 * Return true from `onBack` to handle the press in-page (Studio song edit →
 * song list) without leaving the route.
 */
export function BackButton({
  fallbackHref,
  label = 'Back',
  onNavigate,
  onBack,
  preferHistory = true,
}: {
  fallbackHref?: string
  label?: string
  onNavigate?: () => void
  onBack?: () => boolean | void
  preferHistory?: boolean
}) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack?.() === true) return
    onNavigate?.()
    if (preferHistory && historyCanGoBack()) {
      router.back()
      return
    }
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

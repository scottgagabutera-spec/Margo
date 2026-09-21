'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

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
 * `chrome` lives in the fixed nav (icon only). `page` is the labeled control
 * for surfaces without app nav (karaoke, sign-in, admin).
 *
 * Return true from `onBack` to handle the press in-page without leaving.
 */
export function BackButton({
  fallbackHref,
  label = 'Back',
  onNavigate,
  onBack,
  preferHistory = true,
  variant = 'page',
}: {
  fallbackHref?: string
  label?: string
  onNavigate?: () => void
  onBack?: () => boolean | void
  preferHistory?: boolean
  variant?: 'page' | 'chrome'
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

  const isChrome = variant === 'chrome'

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: isChrome ? 'center' : 'flex-start',
        gap: isChrome ? 0 : '8px',
        minWidth: 'var(--margo-touch-min)',
        minHeight: 'var(--margo-touch-min)',
        width: isChrome ? 'var(--margo-touch-min)' : undefined,
        height: isChrome ? 'var(--margo-touch-min)' : undefined,
        padding: isChrome ? 0 : '0 12px',
        marginLeft: isChrome ? 0 : '-12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ArrowLeftIcon size={isChrome ? 20 : 16} color="var(--text-2)" />
      {isChrome ? null : (
        <span style={{
          fontFamily: UI_FONT,
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'var(--text-2)',
        }}>
          {label}
        </span>
      )}
    </button>
  )
}

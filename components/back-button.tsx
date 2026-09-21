'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@/components/icons'
import { PendingNavLink } from '@/components/pending-nav-link'
import { UI_FONT } from '@/lib/fonts'

/**
 * In-app back for depth routes. Chrome Back is a prefetched Link to the
 * logical parent so the tap is immediate — not router.back() waiting on RSC.
 * Return true from `onBack` to handle the press in-page without leaving.
 */
export function BackButton({
  fallbackHref,
  label = 'Back',
  onBack,
  preferHistory = false,
  variant = 'page',
}: {
  fallbackHref?: string
  label?: string
  onBack?: () => boolean | void
  preferHistory?: boolean
  variant?: 'page' | 'chrome'
}) {
  const router = useRouter()
  const dest = fallbackHref || '/feed'
  const isChrome = variant === 'chrome'

  const chromeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 'var(--margo-touch-min)',
    minHeight: 'var(--margo-touch-min)',
    width: 'var(--margo-touch-min)',
    height: 'var(--margo-touch-min)',
    padding: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
    flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
    textDecoration: 'none',
  }

  if (isChrome) {
    return (
      <PendingNavLink
        href={dest}
        indicator="subtle"
        aria-label={label}
        onClick={(event) => {
          if (onBack?.() === true) event.preventDefault()
        }}
        style={chromeStyle}
      >
        <ArrowLeftIcon size={20} color="var(--text-secondary)" />
      </PendingNavLink>
    )
  }

  const handleBack = () => {
    if (onBack?.() === true) return
    if (preferHistory && typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(dest)
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        minWidth: 'var(--margo-touch-min)',
        minHeight: 'var(--margo-touch-min)',
        padding: '0 12px',
        marginLeft: '-12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ArrowLeftIcon size={16} color="var(--text-secondary)" />
      <span style={{
        fontFamily: UI_FONT,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
      }}>
        {label}
      </span>
    </button>
  )
}

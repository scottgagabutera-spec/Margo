'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@/components/icons'
import { canPopInAppHistory } from '@/components/nav-back'
import { PendingNavLink } from '@/components/pending-nav-link'

/**
 * In-app back for depth routes. Chrome Back pops history immediately when
 * this tab actually has somewhere to go — restoring the previous page from
 * cache instead of remounting the parent. The Link href is only the
 * no-history fallback (new tab / first entry).
 * Return true from `onBack` to handle the press in-page without leaving.
 */
export function BackButton({
  fallbackHref,
  label = 'Back',
  onBack,
  preferHistory,
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

  const iconStyle: React.CSSProperties = {
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
        prefetch
        indicator="subtle"
        aria-label={label}
        onClick={(event) => {
          if (onBack?.() === true) {
            event.preventDefault()
            return
          }
          if (preferHistory !== false && canPopInAppHistory()) {
            event.preventDefault()
            window.history.back()
          }
        }}
        style={iconStyle}
      >
        <ArrowLeftIcon size={20} color="var(--gold)" />
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
        ...iconStyle,
        marginLeft: '-4px',
      }}
    >
      <ArrowLeftIcon size={20} color="var(--gold)" />
    </button>
  )
}

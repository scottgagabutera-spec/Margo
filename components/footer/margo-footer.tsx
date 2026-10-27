'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  SpotifyIcon,
} from '@/components/icons'
import { MARGO_SOCIAL_LINKS } from '@/lib/social-links'
import { MARGO_FOOTER_SECTIONS } from '@/components/footer/margo-footer-links'
import { UI_FONT } from '@/lib/fonts'
import { pushFooterSheetHistory } from '@/lib/landing-footer-sheet-history'

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  x: XIcon,
  youtube: YouTubeIcon,
  spotify: SpotifyIcon,
} as const

const ui = UI_FONT

function ChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      {direction === 'up' ? (
        <path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function CopyrightLine() {
  return (
    <p className="margo-footer__copyright">
      © {new Date().getFullYear()} Margo
    </p>
  )
}

function SocialButtonRow({ className }: { className?: string }) {
  return (
    <div className={`margo-footer__social-row${className ? ` ${className}` : ''}`}>
      {MARGO_SOCIAL_LINKS.map(({ id, label, href }) => {
        const Icon = SOCIAL_ICONS[id]
        return (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="margo-footer__social-btn"
          >
            <Icon size={16} color="currentColor" />
          </a>
        )
      })}
    </div>
  )
}

function FooterLinkSections({ layout }: { layout: 'sheet' | 'desktop' }) {
  return (
    <>
      {MARGO_FOOTER_SECTIONS.map((section) => (
        <div
          key={section.id}
          className={
            layout === 'sheet'
              ? 'margo-footer__sheet-section'
              : 'margo-footer__desktop-group'
          }
        >
          <span className="margo-footer__section-label">{section.label}</span>
          <div className="margo-footer__section-links">
            {section.links.map((link) => (
              <Link key={link.href} href={link.href} className="margo-footer__section-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export function MargoFooter() {
  const pathname = usePathname()
  const sheetId = useId()
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const historyPushedRef = useRef(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const dragStartY = useRef<number | null>(null)

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    if (historyPushedRef.current && typeof window !== 'undefined') {
      historyPushedRef.current = false
      window.history.replaceState(null, '')
    }
  }, [])

  const openSheet = useCallback(() => {
    setSheetOpen(true)
    pushFooterSheetHistory()
    historyPushedRef.current = true
  }, [])

  const toggleSheet = useCallback(() => {
    if (sheetOpen) closeSheet()
    else openSheet()
  }, [sheetOpen, closeSheet, openSheet])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    closeSheet()
  }, [pathname, closeSheet])

  useEffect(() => {
    if (!sheetOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeSheet()
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sheetOpen, closeSheet])

  useEffect(() => {
    const onPopState = () => {
      historyPushedRef.current = false
      setSheetOpen(false)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!sheetOpen) return
    const onDismissScroll = () => closeSheet()
    window.addEventListener('scroll', onDismissScroll, { passive: true })
    document.addEventListener('scroll', onDismissScroll, { passive: true, capture: true })
    window.addEventListener('wheel', onDismissScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onDismissScroll)
      document.removeEventListener('scroll', onDismissScroll, true)
      window.removeEventListener('wheel', onDismissScroll)
    }
  }, [sheetOpen, closeSheet])

  useEffect(() => {
    if (!sheetOpen) return
    const onSearchTap = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('.margo-stage-hero-search')) {
        closeSheet()
      }
    }
    document.addEventListener('pointerdown', onSearchTap, true)
    document.addEventListener('focusin', onSearchTap, true)
    return () => {
      document.removeEventListener('pointerdown', onSearchTap, true)
      document.removeEventListener('focusin', onSearchTap, true)
    }
  }, [sheetOpen, closeSheet])

  const wasSheetOpen = useRef(false)
  useEffect(() => {
    if (!sheetOpen) return
    requestAnimationFrame(() => {
      sheetRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    })
  }, [sheetOpen])

  useLayoutEffect(() => {
    if (!sheetOpen && wasSheetOpen.current) {
      moreButtonRef.current?.focus()
    }
    wasSheetOpen.current = sheetOpen
  }, [sheetOpen])

  const onBackdropDismiss = () => closeSheet()

  const onSheetPointerDown = (e: ReactPointerEvent) => {
    if (!(e.target as HTMLElement).closest('.margo-footer__sheet-handle')) return
    dragStartY.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onSheetPointerMove = (e: ReactPointerEvent) => {
    if (dragStartY.current == null) return
    if (e.clientY - dragStartY.current > 40) {
      dragStartY.current = null
      closeSheet()
    }
  }

  const onSheetPointerUp = (e: ReactPointerEvent) => {
    dragStartY.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch { /* ignore */ }
  }

  const sheetAnimClass = reducedMotion
    ? 'margo-footer__sheet--reduced'
    : sheetOpen
      ? 'margo-footer__sheet--open'
      : 'margo-footer__sheet--closed'

  return (
    <footer
      className={`margo-footer${sheetOpen ? ' margo-footer--sheet-open' : ''}`}
      aria-label="Site footer"
    >
      <div className="margo-footer__desktop">
        <div className="margo-footer__desktop-inner">
          <div className="margo-footer__desktop-left">
            <FooterLinkSections layout="desktop" />
          </div>
          <div className="margo-footer__desktop-right">
            <SocialButtonRow />
            <CopyrightLine />
          </div>
        </div>
      </div>

      <div className="margo-footer__mobile-closed">
        <div className="margo-footer__mobile-row1">
          <SocialButtonRow />
          <button
            ref={moreButtonRef}
            type="button"
            className="margo-footer__more-chip"
            aria-expanded={sheetOpen}
            aria-controls={sheetId}
            onClick={toggleSheet}
            data-margo-footer-more
          >
            More
            <ChevronIcon direction="up" />
          </button>
        </div>
        <CopyrightLine />
      </div>

      {sheetOpen ? (
        <div
          className="margo-footer__backdrop"
          role="presentation"
          onPointerDown={onBackdropDismiss}
          onClick={onBackdropDismiss}
        />
      ) : null}

      {sheetOpen ? (
        <div
          id={sheetId}
          ref={sheetRef}
          className={`margo-footer__sheet ${sheetAnimClass} margo-footer__sheet--visible`}
          role="dialog"
          aria-label="More from Margo"
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerUp}
          onPointerCancel={onSheetPointerUp}
        >
          <div className="margo-footer__sheet-handle" aria-hidden />
          <div className="margo-footer__sheet-content">
            <FooterLinkSections layout="sheet" />
            <div className="margo-footer__sheet-divider" aria-hidden />
            <div className="margo-footer__mobile-row1 margo-footer__mobile-row1--in-sheet">
              <SocialButtonRow />
              <button
                type="button"
                className="margo-footer__more-chip"
                data-margo-footer-sheet-close
                aria-expanded
                aria-controls={sheetId}
                onClick={() => closeSheet()}
              >
                Close
                <ChevronIcon direction="down" />
              </button>
            </div>
            <CopyrightLine />
          </div>
        </div>
      ) : null}
    </footer>
  )
}

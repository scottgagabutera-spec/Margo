'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { EditIcon, PenLineIcon } from '@/components/icons'
import { PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX } from '@/lib/profile-account-menu-layout'

const MENU_RIGHT_INSET_PX = 12

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const nodes = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1,
  )
  if (nodes.length === 0) return
  const first = nodes[0]
  const last = nodes[nodes.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function SignOutIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MenuRow({
  icon,
  children,
  destructive,
  onClick,
  href,
}: {
  icon: ReactNode
  children: ReactNode
  destructive?: boolean
  onClick?: () => void
  href?: string
}) {
  const className = `margo-options-menu__row${destructive ? ' margo-options-menu__row--destructive' : ''}`
  const body = (
    <>
      <span className="margo-options-menu__row-icon" aria-hidden>
        {icon}
      </span>
      <span className="margo-options-menu__row-label">{children}</span>
    </>
  )
  if (href) {
    return (
      <Link href={href} className={className} role="menuitem" onClick={onClick}>
        {body}
      </Link>
    )
  }
  return (
    <button type="button" role="menuitem" className={className} onClick={onClick}>
      {body}
    </button>
  )
}

export type ProfileAccountMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: RefObject<HTMLElement | null>
  showStudio: boolean
  onSignOut: () => void
}

/** Shared ⋯ account menu — opens under the trigger, aligned to the screen's right edge. */
export function ProfileAccountMenu({
  open,
  onOpenChange,
  triggerRef,
  showStudio,
  onSignOut,
}: ProfileAccountMenuProps) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
        return
      }
      const panel = panelRef.current
      if (panel) trapFocus(panel, e)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close, triggerRef])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: Event) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      close()
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open, close, triggerRef])

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const tr = trigger.getBoundingClientRect()
    const mw = panel.offsetWidth
    const right = Math.max(MENU_RIGHT_INSET_PX, window.innerWidth - tr.right)
    panel.style.position = 'fixed'
    panel.style.top = `${tr.bottom + 6}px`
    panel.style.right = `${right}px`
    panel.style.left = 'auto'
    panel.style.zIndex = '200'
    panel.style.transformOrigin = `${mw - (tr.right - tr.left) / 2}px 0`
  }, [open, triggerRef, showStudio])

  useEffect(() => {
    if (!open) return
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="margo-options-menu__backdrop"
        tabIndex={-1}
        onClick={() => {
          close()
          triggerRef.current?.focus()
        }}
      />
      <div
        ref={panelRef}
        role="menu"
        aria-label="Account menu"
        data-margo-profile-account-menu="popover"
        data-margo-profile-menu-width={PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX}
        className="margo-options-menu"
        style={{ width: `${PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX}px` }}
      >
        <MenuRow href="/settings" onClick={close} icon={<EditIcon size={18} color="currentColor" />}>
          Account settings
        </MenuRow>
        {showStudio ? (
          <MenuRow href="/studio" onClick={close} icon={<PenLineIcon size={18} color="currentColor" />}>
            Studio
          </MenuRow>
        ) : null}
        <div className="margo-options-menu__divider" role="separator" />
        <MenuRow
          destructive
          icon={<SignOutIcon />}
          onClick={() => {
            close()
            onSignOut()
            triggerRef.current?.focus()
          }}
        >
          Sign out
        </MenuRow>
      </div>
    </>,
    document.body,
  )
}

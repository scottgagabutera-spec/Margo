'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX } from '@/lib/profile-account-menu-layout'

const font = UI_FONT

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

export type ProfileAccountMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: RefObject<HTMLElement | null>
  showStudio: boolean
  onSignOut: () => void
}

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
    let left = tr.right - mw
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8))
    const top = tr.bottom + 6
    panel.style.position = 'fixed'
    panel.style.top = `${top}px`
    panel.style.left = `${left}px`
    panel.style.right = 'auto'
    panel.style.zIndex = '200'
  }, [open, triggerRef, showStudio])

  useEffect(() => {
    if (!open) return
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  }, [open])

  if (!open || !mounted) return null

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    minHeight: 'var(--margo-touch-min)',
    fontFamily: font,
    fontSize: TYPE.meta,
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    padding: '0 12px',
    borderRadius: '6px',
    boxSizing: 'border-box',
    width: '100%',
  }

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Account menu"
      data-margo-profile-account-menu="popover"
      data-margo-profile-menu-width={PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX}
      style={{
        width: `${PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX}px`,
        maxWidth: 'calc(100vw - 16px)',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        padding: '4px',
      }}
    >
      <Link href="/settings" onClick={close} style={rowStyle} role="menuitem" data-margo-profile-menu-item="settings">
        Account settings
      </Link>
      {showStudio ? (
        <Link href="/studio" onClick={close} style={rowStyle} role="menuitem" data-margo-profile-menu-item="studio">
          Studio
        </Link>
      ) : null}
      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 8px' }} role="separator" />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          close()
          onSignOut()
          triggerRef.current?.focus()
        }}
        style={{
          ...rowStyle,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--destructive)',
        }}
        data-margo-profile-menu-item="sign-out"
      >
        Sign out
      </button>
    </div>,
    document.body,
  )
}

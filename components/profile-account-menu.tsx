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

const font = UI_FONT

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function useIsPhoneSheet() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setPhone(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return phone
}

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
  showApply: boolean
  applyLabel: string
  onSignOut: () => void
}

export function ProfileAccountMenu({
  open,
  onOpenChange,
  triggerRef,
  showStudio,
  showApply,
  applyLabel,
  onSignOut,
}: ProfileAccountMenuProps) {
  const phoneSheet = useIsPhoneSheet()
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    if (phoneSheet) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, phoneSheet])

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
    if (!open || phoneSheet) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const tr = trigger.getBoundingClientRect()
    const mw = panel.offsetWidth
    let left = tr.right - mw
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8))
    const top = tr.bottom + 8
    panel.style.position = 'fixed'
    panel.style.top = `${top}px`
    panel.style.left = `${left}px`
    panel.style.right = 'auto'
    panel.style.zIndex = '200'
  }, [open, phoneSheet, triggerRef, showStudio, showApply])

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
  }, [open, phoneSheet])

  if (!open || !mounted) return null

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    minHeight: 'var(--margo-touch-min)',
    fontFamily: font,
    fontSize: TYPE.secondary,
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    padding: '0 16px',
    borderRadius: '8px',
    boxSizing: 'border-box',
    width: '100%',
  }

  const menuBody = (
    <>
      <Link href="/settings" onClick={close} style={rowStyle} data-margo-profile-menu-item="settings">
        Account Settings
      </Link>
      {showStudio ? (
        <Link href="/studio" onClick={close} style={rowStyle} data-margo-profile-menu-item="studio">
          Studio
        </Link>
      ) : null}
      {showApply ? (
        <Link href="/apply-artist" onClick={close} style={rowStyle} data-margo-profile-menu-item="apply">
          {applyLabel}
        </Link>
      ) : null}
      <div style={{ height: '1px', background: 'var(--border)', margin: '8px 12px' }} role="separator" />
      <button
        type="button"
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
        Sign Out
      </button>
    </>
  )

  if (phoneSheet) {
    return createPortal(
      <div
        role="presentation"
        data-margo-profile-account-menu="sheet"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          aria-label="Dismiss menu"
          onClick={() => {
            close()
            triggerRef.current?.focus()
          }}
          style={{
            position: 'absolute',
            inset: 0,
            border: 'none',
            background: 'var(--margo-scrim)',
            cursor: 'default',
          }}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Account menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'var(--bg)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            border: '1px solid var(--border)',
            padding: '8px 8px calc(12px + env(safe-area-inset-bottom))',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
          }}
        >
          <div
            aria-hidden
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              background: 'var(--border-hi)',
              margin: '6px auto 12px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {menuBody}
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Account menu"
      data-margo-profile-account-menu="popover"
      style={{
        minWidth: '220px',
        maxWidth: 'min(280px, calc(100vw - 16px))',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
        padding: '8px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {menuBody}
      </div>
    </div>,
    document.body,
  )
}

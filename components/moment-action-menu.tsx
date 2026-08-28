'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDownIcon } from '@/components/icons'

const font = 'var(--font-lora), serif'
const MENU_GAP_PX = 6
const MENU_VIEW_PAD_PX = 12

export interface MomentActionMenuItem {
  id: string
  label: string
  hint?: string
  disabled?: boolean
  onClick: () => void
}

interface MomentActionMenuProps {
  label: string
  items: MomentActionMenuItem[]
  variant?: 'primary' | 'secondary'
  busy?: boolean
  /** Replaces the generic busy copy — e.g. video export progress. */
  busyLabel?: string | null
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** z-index for the portaled menu (sheets need > sheet). */
  menuZIndex?: number
}

/**
 * Downward dropdown, portaled to body so sheet overflow cannot clip it.
 * Never reserves empty space when closed. Never opens upward.
 * If the viewport below the trigger is short, the menu scrolls inside.
 */
export function MomentActionMenu({
  label,
  items,
  variant = 'secondary',
  busy = false,
  busyLabel = null,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  menuZIndex = 220,
}: MomentActionMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 })
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vv = typeof window !== 'undefined' ? window.visualViewport : null
      const viewTop = vv?.offsetTop ?? 0
      const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
      const top = r.bottom + MENU_GAP_PX
      const maxHeight = Math.max(120, viewBottom - top - MENU_VIEW_PAD_PX)
      setPos({
        top: Math.max(viewTop + MENU_VIEW_PAD_PX, top),
        left: r.left,
        width: r.width,
        maxHeight,
      })
    }
    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isPrimary = variant === 'primary'

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          width: '100%',
          minHeight: 'var(--margo-touch-min)',
          padding: '0 16px',
          borderRadius: '50px',
          border: isPrimary ? 'none' : '1px solid var(--border-hi)',
          background: isPrimary ? 'var(--gold)' : 'var(--surface-2)',
          color: isPrimary ? 'var(--text-on-gold, var(--bg))' : 'var(--text)',
          fontFamily: font,
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.9px',
          textTransform: 'uppercase',
          cursor: disabled || busy ? 'default' : 'pointer',
          opacity: disabled || busy ? 0.55 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxSizing: 'border-box',
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}>
          {busy ? (busyLabel || 'Please wait…') : label}
        </span>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms ease',
          }}
        >
          <ChevronDownIcon size={12} color="currentColor" />
        </span>
      </button>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            zIndex: menuZIndex,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '6px',
            borderRadius: '14px',
            background: 'var(--surface)',
            border: '1px solid var(--border-hi)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            boxSizing: 'border-box',
          }}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return
                setOpen(false)
                item.onClick()
              }}
              style={{
                width: '100%',
                minHeight: 'var(--margo-touch-min)',
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: item.disabled ? 'transparent' : 'rgba(255,255,255,0.04)',
                cursor: item.disabled ? 'default' : 'pointer',
                textAlign: 'left',
                opacity: item.disabled ? 0.4 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: '2px',
                boxSizing: 'border-box',
              }}
            >
              <span style={{
                fontFamily: font,
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: item.disabled ? 'var(--text-muted)' : 'var(--text)',
              }}>
                {item.label}
              </span>
              {item.hint ? (
                <span style={{
                  fontFamily: font,
                  fontStyle: 'italic',
                  fontSize: '0.62rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.3,
                }}>
                  {item.hint}
                </span>
              ) : null}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

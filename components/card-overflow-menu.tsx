'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

export type CardOverflowItem = {
  id: string
  label: string
  onSelect: () => void
  disabled?: boolean
}

/**
 * Shared ⋯ menu for Discover / catalog / Library / moment cards.
 * Portaled to document.body so overflow:hidden on artwork does not clip
 * or flatten the panel. Stops propagation so parent Link/card taps do not fire.
 */
export function CardOverflowMenu({
  items,
  ariaLabel = 'More actions',
  align = 'right',
}: {
  items: CardOverflowItem[]
  ariaLabel?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const btn = rootRef.current?.querySelector('button')
    const menu = menuRef.current
    if (!btn || !menu) return
    const r = btn.getBoundingClientRect()
    const mh = menu.offsetHeight
    const mw = menu.offsetWidth
    const gap = 6
    const spaceBelow = window.innerHeight - r.bottom - 8
    const openUp = spaceBelow < mh && r.top > mh + gap
    const top = openUp ? r.top - gap - mh : r.bottom + gap
    let left = align === 'right' ? r.right - mw : r.left
    left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - mw - 8))
    setPos({ top, left })
  }, [open, align, items.length])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onRepositionClose = () => setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onRepositionClose)
    window.addEventListener('scroll', onRepositionClose, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onRepositionClose)
      window.removeEventListener('scroll', onRepositionClose, true)
    }
  }, [open])

  if (items.length === 0) return null

  const panel = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            zIndex: 200,
            minWidth: '188px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-hi)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px var(--border)',
            boxSizing: 'border-box',
            visibility: pos ? 'visible' : 'hidden',
          }}
        >
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                if (item.disabled) return
                setOpen(false)
                item.onSelect()
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                minHeight: 'var(--margo-touch-min)',
                background: 'none',
                border: 'none',
                color: item.disabled ? 'var(--text-muted)' : 'var(--text)',
                fontFamily: UI_FONT,
                fontSize: '0.82rem',
                cursor: item.disabled ? 'default' : 'pointer',
                borderRadius: '8px',
                opacity: item.disabled ? 0.45 : 1,
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => {
                if (item.disabled) return
                e.currentTarget.style.background = 'var(--gold-faint)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', flexShrink: 0 }}
      onClick={e => { e.preventDefault(); e.stopPropagation() }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(o => !o)
        }}
        style={{
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          borderRadius: '50%',
          border: '1px solid var(--border-hi)',
          background: 'var(--margo-bar)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        <MoreIcon size={16} color="var(--text-secondary)" />
      </button>
      {panel}
    </div>
  )
}

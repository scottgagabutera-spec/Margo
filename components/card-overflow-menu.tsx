'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MoreIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

export type CardOverflowItem = {
  id: string
  label: string
  onSelect: () => void
  disabled?: boolean
}

/**
 * Shared ⋯ menu for Discover / catalog / moment cards.
 * Stops propagation so parent Link/card taps do not fire.
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
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
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

  if (items.length === 0) return null

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
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(7,6,10,0.72)',
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
      {open && (
        <div
          id={menuId}
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            [align === 'right' ? 'right' : 'left']: 0,
            marginTop: '6px',
            zIndex: 30,
            minWidth: '168px',
            background: 'var(--bg)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
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
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

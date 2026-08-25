'use client'

import { useEffect, useRef, useState } from 'react'

const font = 'var(--font-lora), serif'

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
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Open menu above the trigger — rarely used; default opens downward. */
  dropUp?: boolean
}

export function MomentActionMenu({
  label,
  items,
  variant = 'secondary',
  busy = false,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  dropUp = false,
}: MomentActionMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const rootRef = useRef<HTMLDivElement>(null)

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

  const isPrimary = variant === 'primary'

  return (
    <div ref={rootRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: '100%',
          minHeight: '40px',
          padding: '0 16px',
          borderRadius: '50px',
          border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.12)',
          background: isPrimary ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
          color: isPrimary ? 'var(--bg)' : 'var(--text)',
          fontFamily: font,
          fontSize: '0.56rem',
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
        {busy ? 'Please wait…' : label}
        <span aria-hidden style={{ fontSize: '10px', lineHeight: 1, opacity: 0.75 }}>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            ...(dropUp
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }),
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '6px',
            borderRadius: '14px',
            background: 'var(--surface, #121018)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
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
                minHeight: '38px',
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
                gap: '2px',
              }}
            >
              <span style={{
                fontFamily: font,
                fontSize: '0.62rem',
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
        </div>
      )}
    </div>
  )
}

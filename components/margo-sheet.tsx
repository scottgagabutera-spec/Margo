'use client'

import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from '@/components/icons'

export interface MargoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  zIndex?: number
  /** auto = content-sized (card export); fixed = tall sheet (send-to) */
  heightMode?: 'auto' | 'fixed'
  maxHeight?: string
  closeDisabled?: boolean
  /** Card export menus expand outside the panel */
  panelOverflow?: 'visible' | 'hidden'
  contentOverflow?: 'visible' | 'hidden' | 'auto'
  bottomInset?: 'tabbar' | 'tabbar-tight'
}

const SCRIM = 'rgba(7,6,10,0.92)'

/**
 * Top-anchored sheet with safe-area padding — shared by Card modal, Send-to, etc.
 * Grows downward from below the status bar; never vertically centers tall content.
 */
export function MargoSheet({
  open,
  onOpenChange,
  title,
  children,
  zIndex = 200,
  heightMode = 'auto',
  maxHeight = 'min(82dvh, 620px)',
  closeDisabled = false,
  panelOverflow = 'hidden',
  contentOverflow = 'auto',
  bottomInset = 'tabbar',
}: MargoSheetProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const bottomPad = bottomInset === 'tabbar-tight'
    ? 'calc(12px + var(--margo-tabbar-h, 64px) + 16px)'
    : 'calc(12px + var(--margo-tabbar-h, 64px) + 28px)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex, overscrollBehavior: 'none' }}>
      <button
        type="button"
        aria-label="Close"
        onClick={() => { if (!closeDisabled) onOpenChange(false) }}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: SCRIM,
          cursor: 'default',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          minHeight: '100%',
          padding: '12px',
          paddingTop: 'max(28px, calc(12px + env(safe-area-inset-top, 0px)))',
          paddingBottom: bottomPad,
          pointerEvents: 'none',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '460px',
            ...(heightMode === 'fixed' ? { height: maxHeight, maxHeight } : { maxHeight }),
            background: 'var(--surface, #0F0E13)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: panelOverflow,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 18px 12px',
            flexShrink: 0,
            gap: '12px',
          }}>
            <p style={{
              fontFamily: 'var(--font-lora), serif',
              fontSize: '0.58rem',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              {title}
            </p>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              disabled={closeDisabled}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                flexShrink: 0,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-hi)',
                cursor: closeDisabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                opacity: closeDisabled ? 0.5 : 1,
              }}
            >
              <CloseIcon size={14} color="var(--text-secondary)" />
            </button>
          </div>
          <div style={{
            flex: heightMode === 'fixed' ? 1 : undefined,
            minHeight: heightMode === 'fixed' ? 0 : undefined,
            display: heightMode === 'fixed' ? 'flex' : undefined,
            flexDirection: heightMode === 'fixed' ? 'column' : undefined,
            padding: '0 18px 20px',
            overflow: contentOverflow,
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

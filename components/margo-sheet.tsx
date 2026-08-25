'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  /** Card export menus expand outside the panel body */
  panelOverflow?: 'visible' | 'hidden'
  contentOverflow?: 'visible' | 'hidden' | 'auto'
  bottomInset?: 'tabbar' | 'tabbar-tight'
}

const SCRIM = 'rgba(7,6,10,0.92)'
const HEADER_APPROX_PX = 70

/**
 * Top-anchored sheet — portaled to body so it clears tab-pane stacking.
 * Header never scrolls away; body scrolls when tall.
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.setAttribute('data-margo-sheet-open', '1')
    return () => {
      document.body.style.overflow = prev
      document.documentElement.removeAttribute('data-margo-sheet-open')
    }
  }, [open])

  if (!open || !mounted) return null

  const bottomPad = bottomInset === 'tabbar-tight'
    ? 'calc(12px + var(--margo-tabbar-h, 64px) + 16px)'
    : 'calc(12px + var(--margo-tabbar-h, 64px) + 28px)'

  const topPad = 'max(16px, env(safe-area-inset-top, 0px))'
  const panelMaxHeight = heightMode === 'fixed'
    ? maxHeight
    : `min(${maxHeight}, calc(100dvh - ${topPad} - 12px - ${bottomPad}))`

  const bodyMaxHeight = heightMode === 'fixed'
    ? undefined
    : `calc(${panelMaxHeight} - ${HEADER_APPROX_PX}px)`

  return createPortal(
    <div
      className="margo-sheet-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        overscrollBehavior: 'none',
        overflow: 'hidden',
      }}
    >
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
        className="margo-sheet-frame"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          boxSizing: 'border-box',
          padding: '12px',
          paddingTop: `calc(12px + ${topPad})`,
          paddingBottom: bottomPad,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <div
          className="margo-sheet-panel"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '460px',
            maxHeight: panelMaxHeight,
            ...(heightMode === 'fixed' ? { height: panelMaxHeight } : { height: 'fit-content' }),
            background: 'var(--surface, #0F0E13)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            flexShrink: 0,
          }}
        >
          <div
            className="margo-sheet-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 18px 12px',
              flexShrink: 0,
              gap: '12px',
              background: 'var(--surface, #0F0E13)',
              borderRadius: '20px 20px 0 0',
            }}
          >
            <p style={{
              fontFamily: 'var(--font-lora), serif',
              fontSize: '0.58rem',
              fontWeight: 700,
              color: 'var(--gold)',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1.3,
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
          <div
            className="margo-sheet-body"
            style={{
              flex: heightMode === 'fixed' ? 1 : '0 1 auto',
              minHeight: 0,
              maxHeight: bodyMaxHeight,
              padding: '0 18px 20px',
              overflowY: contentOverflow === 'visible' ? 'visible' : 'auto',
              overflowX: panelOverflow === 'visible' ? 'visible' : 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <style>{`
        @media (min-width: 640px) {
          .margo-sheet-frame {
            padding-top: calc(20px + max(16px, env(safe-area-inset-top, 0px))) !important;
          }
          .margo-sheet-panel {
            max-width: 480px;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}

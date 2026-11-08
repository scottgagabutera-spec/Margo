'use client'

import { useCallback, useId, useState } from 'react'
import { RectangleVertical, Square } from 'lucide-react'
import { LandingComposerPopover } from '@/components/landing/landing-composer-popover'
import type { MomentShapeId } from '@/lib/moment/types'
import { UI_FONT } from '@/lib/fonts'

export type MomentFormatMenuVariant = 'landing-tool' | 'studio' | 'customize'

export interface MomentFormatMenuProps {
  shapeId: MomentShapeId
  onShapeChange: (id: MomentShapeId) => void
  variant: MomentFormatMenuVariant
  /** Controlled open (landing toolbar shares one popover slot). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Called after picking a format or when the menu should yield to a sibling popover. */
  onClose?: () => void
}

function FormatPickOptions({
  shapeId,
  onPick,
}: {
  shapeId: MomentShapeId
  onPick: (id: MomentShapeId) => void
}) {
  return (
    <div className="margo-landing-format-pick">
      <button
        type="button"
        className={`margo-landing-format-pick__opt${shapeId === 'square' ? ' margo-landing-format-pick__opt--on' : ''}`}
        onClick={() => onPick('square')}
      >
        <span className="margo-landing-format-pick__glyph margo-landing-format-pick__glyph--square" aria-hidden />
        <span className="margo-landing-format-pick__title" style={{ fontFamily: UI_FONT }}>
          Square
        </span>
        <span className="margo-landing-format-pick__ratio" style={{ fontFamily: UI_FONT }}>
          1:1
        </span>
      </button>
      <button
        type="button"
        className={`margo-landing-format-pick__opt${shapeId === 'vertical' ? ' margo-landing-format-pick__opt--on' : ''}`}
        onClick={() => onPick('vertical')}
      >
        <span className="margo-landing-format-pick__glyph margo-landing-format-pick__glyph--story" aria-hidden />
        <span className="margo-landing-format-pick__title" style={{ fontFamily: UI_FONT }}>
          Story
        </span>
        <span className="margo-landing-format-pick__ratio" style={{ fontFamily: UI_FONT }}>
          9:16
        </span>
      </button>
    </div>
  )
}

function FormatTriggerIcon({ shapeId }: { shapeId: MomentShapeId }) {
  if (shapeId === 'vertical') {
    return <RectangleVertical size={18} strokeWidth={1.75} aria-hidden />
  }
  return <Square size={18} strokeWidth={1.75} aria-hidden />
}

export function MomentFormatMenu({
  shapeId,
  onShapeChange,
  variant,
  open: openControlled,
  onOpenChange,
  onClose,
}: MomentFormatMenuProps) {
  const triggerId = useId()
  const [openUncontrolled, setOpenUncontrolled] = useState(false)
  const open = openControlled ?? openUncontrolled
  const setOpen = useCallback(
    (next: boolean) => {
      if (openControlled === undefined) setOpenUncontrolled(next)
      onOpenChange?.(next)
      if (!next) onClose?.()
    },
    [onClose, onOpenChange, openControlled],
  )

  const toggle = useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  const close = useCallback(() => setOpen(false), [setOpen])

  const pick = useCallback(
    (id: MomentShapeId) => {
      onShapeChange(id)
      close()
    },
    [close, onShapeChange],
  )

  const popoverAlign = variant === 'landing-tool' ? 'format' : 'left'

  const trigger =
    variant === 'landing-tool' ? (
      <div className="margo-landing-tool-wrap">
        <button
          type="button"
          id={triggerId}
          className="margo-landing-tool"
          aria-label="Format"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-pressed={open || undefined}
          onPointerDown={(e) => e.currentTarget.setAttribute('data-margo-acked', '1')}
          onClick={toggle}
        >
          <FormatTriggerIcon shapeId={shapeId} />
        </button>
        <span className="margo-landing-tool__label" style={{ fontFamily: UI_FONT }}>
          Format
        </span>
      </div>
    ) : variant === 'studio' ? (
      <button
        type="button"
        id={triggerId}
        className="margo-moment-studio__studio-btn"
        aria-label="Format"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-pressed={open || undefined}
        onClick={toggle}
      >
        <FormatTriggerIcon shapeId={shapeId} />
        <span style={{ marginLeft: 6 }}>Format</span>
      </button>
    ) : (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.56rem',
            fontWeight: 600,
            letterSpacing: '0.55px',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            lineHeight: 1,
            marginBottom: '10px',
            display: 'block',
            textAlign: 'center',
          }}
        >
          Format
        </span>
        <button
          type="button"
          id={triggerId}
          aria-label="Format"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-pressed={open || undefined}
          onClick={toggle}
          style={{
            width: '100%',
            minHeight: 'var(--margo-touch-min)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 6px',
            borderRadius: '12px',
            border: open ? '1px solid var(--gold-border)' : '1px solid var(--border-hi)',
            background: open ? 'var(--gold-faint)' : 'var(--surface-3)',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            boxSizing: 'border-box',
          }}
        >
          <FormatTriggerIcon shapeId={shapeId} />
        </button>
      </div>
    )

  return (
    <div className={`margo-moment-format-menu-host margo-moment-format-menu-host--${variant}`}>
      {trigger}
      <LandingComposerPopover open={open} align={popoverAlign} onClose={close}>
        <FormatPickOptions shapeId={shapeId} onPick={pick} />
      </LandingComposerPopover>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { ChevronDownIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

interface MomentExportScrollHintProps {
  /** When false, hint is hidden immediately. */
  active: boolean
}

/**
 * Shown at the bottom of the export sheet when vertical preview + controls
 * extend below the fold. Dismisses on scroll or when content fits.
 */
export function MomentExportScrollHint({ active }: MomentExportScrollHintProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }

    const body = document.querySelector<HTMLElement>('.margo-sheet-body')
    if (!body) return

    const update = () => {
      const overflow = body.scrollHeight - body.clientHeight
      const canScroll = overflow > 12
      const nearBottom = body.scrollTop >= overflow - 12
      setVisible(canScroll && !nearBottom)
    }

    update()
    body.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(update)
      : null
    ro?.observe(body)

    return () => {
      body.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [active])

  if (!visible) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(var(--margo-tabbar-h, 64px) + 28px + env(safe-area-inset-bottom, 0px))',
        zIndex: 205,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        width: 'min(100%, 460px)',
        padding: '0 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '320px',
        height: '36px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(15,14,19,0.92) 70%)',
        borderRadius: '0 0 12px 12px',
      }} />
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '999px',
        border: '1px solid var(--border-hi)',
        background: 'rgba(15,14,19,0.94)',
        color: 'var(--text-secondary)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}>
        <ChevronDownIcon size={12} color="var(--gold)" />
        <span style={{
          fontFamily: font,
          fontSize: '0.55rem',
          fontWeight: 700,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
        }}>
          Scroll for more
        </span>
      </div>
    </div>
  )
}

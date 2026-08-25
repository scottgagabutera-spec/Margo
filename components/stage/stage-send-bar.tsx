'use client'

import { useState } from 'react'
import { UI_FONT } from '@/lib/fonts'
import { MomentActionMenu, type MomentActionMenuItem } from '@/components/moment-action-menu'

interface StageSendBarProps {
  saveItems: MomentActionMenuItem[]
  shareItems: MomentActionMenuItem[]
  saving?: boolean
  shareBusy?: boolean
  onSendToMargo?: () => void
  sending?: boolean
  sentPostId?: string | null
  onOpenSendTo?: () => void
  signedIn?: boolean
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  gap: '8px',
  width: '100%',
  alignItems: 'flex-start',
}

/**
 * Save ▾ + Share ▾ (same as card modal). Send to Margo is a separate row below.
 */
export function StageSendBar({
  saveItems,
  shareItems,
  saving = false,
  shareBusy = false,
  onSendToMargo,
  sending = false,
  sentPostId = null,
  onOpenSendTo,
  signedIn = false,
}: StageSendBarProps) {
  const sent = !!sentPostId
  const [openMenu, setOpenMenu] = useState<'save' | 'share' | null>(null)
  const busy = saving || shareBusy

  const publishButtonStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 'var(--margo-touch-min)',
    padding: '0 20px',
    borderRadius: '50px',
    border: 'none',
    background: 'var(--gold)',
    color: 'var(--text-on-gold, var(--bg))',
    fontFamily: UI_FONT,
    fontSize: '0.56rem',
    fontWeight: 700,
    letterSpacing: '0.9px',
    textTransform: 'uppercase',
    cursor: sending ? 'wait' : 'pointer',
    opacity: sending ? 0.7 : 1,
  }

  return (
    <div
      className="stage-send-bar"
      style={{
        width: '100%',
        marginTop: 'var(--stage-moment-to-actions, 22px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '10px',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div style={rowStyle}>
        <MomentActionMenu
          label="Save"
          items={saveItems}
          variant="primary"
          busy={saving}
          open={openMenu === 'save'}
          onOpenChange={(next) => setOpenMenu(next ? 'save' : null)}
        />
        <MomentActionMenu
          label="Share"
          items={shareItems.length > 0 ? shareItems : [{ id: 'none', label: 'Not available', disabled: true, onClick: () => {} }]}
          variant="secondary"
          busy={shareBusy}
          disabled={shareItems.length === 0}
          open={openMenu === 'share'}
          onOpenChange={(next) => setOpenMenu(next ? 'share' : null)}
        />
      </div>

      {!sent ? (
        signedIn ? (
          <button
            type="button"
            onClick={onSendToMargo}
            disabled={sending || busy}
            style={publishButtonStyle}
          >
            {sending ? 'Sending…' : 'Send to Margo'}
          </button>
        ) : (
          <a
            href="/signin"
            style={{
              ...publishButtonStyle,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
            }}
          >
            Sign in to send
          </a>
        )
      ) : (
        <button
          type="button"
          onClick={onOpenSendTo}
          style={{
            ...publishButtonStyle,
            background: 'transparent',
            color: 'var(--text)',
            border: '1px solid var(--border-hi)',
          }}
        >
          Send to someone
        </button>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { UI_FONT } from '@/lib/fonts'
import { MomentActionMenu, type MomentActionMenuItem } from '@/components/moment-action-menu'

interface StageSendBarProps {
  onSaveImage: () => void
  saving?: boolean
  signedIn?: boolean
  onSend?: () => void
  sending?: boolean
  sentPostId?: string | null
  onNativeShare?: () => void
  onOpenSendTo?: () => void
  hasSnippet?: boolean
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
 * Moment-adjacent actions — inline below the Stage card, one row (no wrap).
 */
export function StageSendBar({
  onSaveImage,
  saving = false,
  signedIn = false,
  onSend,
  sending = false,
  sentPostId = null,
  onNativeShare,
  onOpenSendTo,
  hasSnippet = false,
}: StageSendBarProps) {
  const sent = !!sentPostId
  const [openMenu, setOpenMenu] = useState<'save' | 'share' | null>(null)

  const saveItems: MomentActionMenuItem[] = [
    { id: 'png', label: 'Save as image', onClick: onSaveImage },
    { id: 'pdf', label: 'Save as PDF', hint: 'Coming soon', disabled: true, onClick: () => {} },
    {
      id: 'gif',
      label: 'Save as GIF',
      hint: hasSnippet ? 'Animated snippet' : 'Needs a playable snippet',
      disabled: !hasSnippet,
      onClick: () => {},
    },
  ]

  const shareItems: MomentActionMenuItem[] = onNativeShare
    ? [{ id: 'link', label: 'Share link', hint: 'Send outside Margo', onClick: onNativeShare }]
    : []

  const sendButtonStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    minHeight: 'var(--margo-touch-min)',
    padding: '0 16px',
    borderRadius: '50px',
    border: '1px solid var(--border-hi)',
    background: 'transparent',
    color: 'var(--text)',
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
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {sent ? (
        <>
          <p style={{
            margin: 0,
            fontFamily: UI_FONT,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            On Margo. Share your link or send to someone.
          </p>
          <div style={rowStyle}>
            <button
              type="button"
              onClick={onOpenSendTo}
              style={{
                ...sendButtonStyle,
                background: 'var(--gold)',
                color: 'var(--text-on-gold, var(--bg))',
                border: 'none',
              }}
            >
              Send to someone
            </button>
            <MomentActionMenu
              label="Share"
              items={shareItems.length > 0 ? shareItems : [{ id: 'none', label: 'Not available', disabled: true, onClick: () => {} }]}
              variant="secondary"
              disabled={shareItems.length === 0}
              open={openMenu === 'share'}
              onOpenChange={(next) => setOpenMenu(next ? 'share' : null)}
            />
          </div>
        </>
      ) : (
        <>
          <p style={{
            margin: 0,
            fontFamily: UI_FONT,
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}>
            Save your card or send this Moment to Margo.
          </p>
          <div style={rowStyle}>
            <MomentActionMenu
              label="Save"
              items={saveItems}
              variant="primary"
              busy={saving}
              open={openMenu === 'save'}
              onOpenChange={(next) => setOpenMenu(next ? 'save' : null)}
            />
            {signedIn ? (
              <button
                type="button"
                onClick={onSend}
                disabled={sending}
                style={sendButtonStyle}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            ) : (
              <a
                href="/signin"
                style={{
                  ...sendButtonStyle,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  fontSize: '0.56rem',
                  letterSpacing: '0.9px',
                  textTransform: 'uppercase',
                }}
              >
                Sign in
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { UI_FONT } from '@/lib/fonts'
import { MomentActionMenu, type MomentActionMenuItem } from '@/components/moment-action-menu'
import { SignInLink } from '@/components/signin-link'

interface StageSendBarProps {
  saveItems: MomentActionMenuItem[]
  shareItems: MomentActionMenuItem[]
  saving?: boolean
  shareBusy?: boolean
  videoProgress?: string | null
  onSendToMargo?: () => void
  sending?: boolean
  sentPostId?: string | null
  onOpenSendTo?: () => void
  signedIn?: boolean
  postLabel?: string
  menuPlacement?: 'down' | 'up'
  compact?: boolean
}

const publishButtonStyle: React.CSSProperties = {
  minHeight: '44px',
  padding: '0 22px',
  borderRadius: '50px',
  border: 'none',
  background: 'var(--gold)',
  color: 'var(--text-on-gold, var(--bg))',
  fontFamily: UI_FONT,
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.4px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

/**
 * Export ▾ + Share ▾ on the left; Post / Sign in to post on the right (one row).
 */
export function StageSendBar({
  saveItems,
  shareItems,
  saving = false,
  shareBusy = false,
  videoProgress = null,
  onSendToMargo,
  sending = false,
  sentPostId = null,
  onOpenSendTo,
  signedIn = false,
  postLabel = 'Post',
  menuPlacement = 'down',
  compact = false,
}: StageSendBarProps) {
  const sent = !!sentPostId
  const [openMenu, setOpenMenu] = useState<'save' | 'share' | null>(null)
  const busy = saving || shareBusy

  return (
    <div
      className="stage-send-bar"
      style={{
        width: '100%',
        marginTop: compact ? '12px' : 'var(--stage-moment-to-actions, 22px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '10px',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {videoProgress ? (
        <p
          role="status"
          aria-live="polite"
          style={{
            margin: 0,
            fontFamily: 'var(--font-lora), serif',
            fontSize: '0.68rem',
            fontStyle: 'italic',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {videoProgress}
        </p>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          gap: '8px',
          width: '100%',
          alignItems: 'center',
        }}
      >
        <MomentActionMenu
          label="Export"
          items={saveItems}
          variant="secondary"
          busy={saving}
          busyLabel={videoProgress}
          open={openMenu === 'save'}
          onOpenChange={(next) => setOpenMenu(next ? 'save' : null)}
          menuPlacement={menuPlacement}
          compact={compact}
          hideItemHints
        />
        <MomentActionMenu
          label="Share"
          items={shareItems.length > 0 ? shareItems : [{ id: 'none', label: 'Not available', disabled: true, onClick: () => {} }]}
          variant="secondary"
          busy={shareBusy}
          busyLabel={videoProgress}
          disabled={shareItems.length === 0}
          open={openMenu === 'share'}
          onOpenChange={(next) => setOpenMenu(next ? 'share' : null)}
          menuPlacement={menuPlacement}
          compact={compact}
          hideItemHints
        />
        <div style={{ flex: 1, minWidth: '8px' }} aria-hidden />
        {!sent ? (
          signedIn ? (
            <button
              type="button"
              onClick={onSendToMargo}
              disabled={sending || busy}
              style={{
                ...publishButtonStyle,
                opacity: sending || busy ? 0.7 : 1,
                cursor: sending ? 'wait' : 'pointer',
              }}
            >
              {sending ? 'Posting…' : postLabel}
            </button>
          ) : (
            <SignInLink
              style={{
                ...publishButtonStyle,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              Sign in to post
            </SignInLink>
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
    </div>
  )
}

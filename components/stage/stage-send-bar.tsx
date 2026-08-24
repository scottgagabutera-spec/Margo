'use client'

import { UI_FONT } from '@/lib/fonts'

interface StageSendBarProps {
  onSaveImage: () => void
  saving?: boolean
  signedIn?: boolean
  onSend?: () => void
  sending?: boolean
  sentPostId?: string | null
  onNativeShare?: () => void
  onOpenSendTo?: () => void
}

/**
 * Moment-adjacent actions — inline below the Gold Moment, not fixed viewport chrome.
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
}: StageSendBarProps) {
  const sent = !!sentPostId

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
          <p
            style={{
              margin: '0 0 4px',
              fontFamily: UI_FONT,
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text)',
              textAlign: 'center',
            }}
          >
            Sent.
          </p>
          <p
            style={{
              margin: '0 0 8px',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Share your Moment link or send it to someone on Margo.
          </p>
          <button
            type="button"
            onClick={onOpenSendTo}
            style={{
              width: '100%',
              minHeight: 'var(--margo-touch-min)',
              padding: '0 20px',
              borderRadius: '50px',
              border: 'none',
              background: 'var(--gold)',
              color: 'var(--text-on-gold, var(--bg))',
              fontFamily: UI_FONT,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Send to someone
          </button>
          <button
            type="button"
            onClick={onNativeShare}
            style={{
              width: '100%',
              minHeight: 'var(--margo-touch-min)',
              padding: '0 20px',
              borderRadius: '50px',
              border: '1px solid var(--border-hi)',
              background: 'transparent',
              color: 'var(--text)',
              fontFamily: UI_FONT,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Share link
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onSaveImage}
            disabled={saving}
            style={{
              width: '100%',
              minHeight: 'var(--margo-touch-min)',
              padding: '0 20px',
              borderRadius: '50px',
              border: 'none',
              background: 'var(--gold)',
              color: 'var(--text-on-gold, var(--bg))',
              fontFamily: UI_FONT,
              fontSize: '0.82rem',
              fontWeight: 600,
              letterSpacing: '0.2px',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {signedIn ? (
            <button
              type="button"
              onClick={onSend}
              disabled={sending}
              style={{
                width: '100%',
                minHeight: 'var(--margo-touch-min)',
                padding: '0 20px',
                borderRadius: '50px',
                border: '1px solid var(--border-hi)',
                background: 'transparent',
                color: 'var(--text)',
                fontFamily: UI_FONT,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: sending ? 'wait' : 'pointer',
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          ) : (
            <a
              href="/signin"
              style={{
                fontFamily: UI_FONT,
                fontSize: '0.72rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
                textDecoration: 'none',
                padding: '4px 8px',
                minHeight: 'var(--margo-touch-min)',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Sign in to send
            </a>
          )}
        </>
      )}
    </div>
  )
}

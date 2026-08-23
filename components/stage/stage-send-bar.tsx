'use client'

import { UI_FONT } from '@/lib/fonts'

interface StageSendBarProps {
  onSaveImage: () => void
  saving?: boolean
  signedIn?: boolean
}

/**
 * Moment-adjacent actions — inline below the Gold Moment, not fixed viewport chrome.
 */
export function StageSendBar({ onSaveImage, saving = false, signedIn = false }: StageSendBarProps) {
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
      {!signedIn ? (
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
      ) : (
        <span
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.72rem',
            fontWeight: 500,
            color: 'var(--text-disabled)',
          }}
        >
          Send coming soon
        </span>
      )}
    </div>
  )
}

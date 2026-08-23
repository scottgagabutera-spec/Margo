'use client'

import { UI_FONT } from '@/lib/fonts'

interface StageSendBarProps {
  onSaveImage: () => void
  saving?: boolean
  signedIn?: boolean
}

export function StageSendBar({ onSaveImage, saving = false, signedIn = false }: StageSendBarProps) {
  return (
    <div
      className="stage-send-bar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 45,
        padding: '10px 20px calc(10px + env(safe-area-inset-bottom))',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={signedIn ? 'Coming soon' : undefined}
            style={{
              flex: 1,
              minHeight: 'var(--margo-touch-min)',
              padding: '0 16px',
              borderRadius: '50px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-disabled)',
              fontFamily: UI_FONT,
              fontSize: '0.82rem',
              fontWeight: 500,
              letterSpacing: '0.2px',
              cursor: 'not-allowed',
              opacity: 0.55,
            }}
          >
            {signedIn ? 'Send' : 'Sign in to send'}
          </button>
          <button
            type="button"
            onClick={onSaveImage}
            disabled={saving}
            style={{
              flex: 1,
              minHeight: 'var(--margo-touch-min)',
              padding: '0 16px',
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
        </div>
        {!signedIn && (
          <p
            style={{
              margin: 0,
              textAlign: 'center',
              fontFamily: UI_FONT,
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
            }}
          >
            Sign in to send lines
          </p>
        )}
      </div>
    </div>
  )
}

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
        padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(to top, var(--bg) 70%, transparent)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={signedIn ? 'Coming soon' : 'Available after sign in'}
            style={{
              flex: 1,
              minHeight: 'var(--margo-touch-min)',
              padding: '0 20px',
              borderRadius: '50px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-muted)',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              cursor: 'not-allowed',
              opacity: 0.65,
            }}
          >
            Send
          </button>
          <button
            type="button"
            onClick={onSaveImage}
            disabled={saving}
            style={{
              flex: 1,
              minHeight: 'var(--margo-touch-min)',
              padding: '0 20px',
              borderRadius: '50px',
              border: 'none',
              background: 'var(--gold)',
              color: 'var(--text-on-gold, var(--bg))',
              fontFamily: UI_FONT,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 20px var(--gold-glow)',
            }}
          >
            {saving ? 'Saving…' : 'Save image'}
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
            Available after sign in
          </p>
        )}
      </div>
    </div>
  )
}

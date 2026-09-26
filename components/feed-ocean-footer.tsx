'use client'

import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

/**
 * Soft bottom edge — no "end of feed" line. Optional load-more control when older pages exist.
 */
export function FeedOceanFooter({
  loadingOlder,
  hasMore,
  onLoadOlder,
}: {
  loadingOlder?: boolean
  hasMore?: boolean
  onLoadOlder?: () => void
}) {
  return (
    <div
      aria-hidden={!hasMore && !loadingOlder}
      style={{
        position: 'relative',
        marginTop: '8px',
        padding: '32px 0 48px',
        textAlign: 'center',
      }}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '80px',
        background: 'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bg) 92%, var(--gold) 8%))',
        pointerEvents: 'none',
        opacity: 0.35,
      }} />
      {hasMore && onLoadOlder ? (
        <button
          type="button"
          onClick={onLoadOlder}
          disabled={loadingOlder}
          style={{
            position: 'relative',
            minHeight: 'var(--margo-touch-min)',
            padding: '0 20px',
            borderRadius: '50px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontFamily: font,
            fontSize: TYPE.label,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: loadingOlder ? 'wait' : 'pointer',
            opacity: loadingOlder ? 0.7 : 1,
          }}
        >
          {loadingOlder ? 'Loading…' : 'Earlier moments'}
        </button>
      ) : null}
    </div>
  )
}

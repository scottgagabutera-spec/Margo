'use client'

import type { CSSProperties } from 'react'

/**
 * Branded loading silhouettes for primary surfaces.
 * Opacity pulse only (no layout animation) — matches catalog-grid feel.
 * Inline styles + CSS variables; not the Tailwind shadcn Skeleton.
 */

const font = 'var(--font-lora), serif'

const pulseKeyframes = `
@keyframes margoSkeletonPulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.75; }
}
`

function PulseStyle() {
  return <style>{pulseKeyframes}</style>
}

function bone(
  extra: CSSProperties,
  delayMs = 0,
): CSSProperties {
  return {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.06)',
    animation: `margoSkeletonPulse 1.4s ease-in-out ${delayMs}ms infinite`,
    ...extra,
  }
}

/** Feed-shaped post cards (avatar + lyric lines + action row). */
export function FeedPostSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PulseStyle />
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '20px 0',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={bone({ width: 40, height: 40, borderRadius: '50%', border: 'none' }, i * 60)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={bone({ height: 10, width: '36%', borderRadius: 4, border: 'none' }, i * 60 + 40)} />
              <div style={bone({ height: 8, width: '22%', borderRadius: 4, border: 'none' }, i * 60 + 80)} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18, paddingLeft: 4 }}>
            <div style={bone({ height: 14, width: '92%', borderRadius: 4, border: 'none' }, i * 60 + 100)} />
            <div style={bone({ height: 14, width: '78%', borderRadius: 4, border: 'none' }, i * 60 + 140)} />
            <div style={bone({ height: 14, width: '64%', borderRadius: 4, border: 'none' }, i * 60 + 180)} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                style={bone({
                  height: 36,
                  flex: 1,
                  maxWidth: 88,
                  borderRadius: 50,
                  border: 'none',
                  background: 'rgba(255,255,255,0.03)',
                }, i * 60 + 200 + j * 40)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Discover: artwork tiles + moment-row bars. */
export function DiscoverPageSkeleton() {
  return (
    <div style={{ padding: '8px 0 40px' }}>
      <PulseStyle />
      <div style={{ marginBottom: 28 }}>
        <div style={bone({ height: 10, width: 100, borderRadius: 4, border: 'none', marginBottom: 14 }, 0)} />
        <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              style={bone({
                flexShrink: 0,
                width: 160,
                height: 72,
                borderRadius: 12,
              }, i * 70)}
            />
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 28 }}>
        <div style={bone({ height: 10, width: 88, borderRadius: 4, border: 'none', marginBottom: 14 }, 80)} />
        <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              style={bone({
                flexShrink: 0,
                width: 120,
                height: 120,
                borderRadius: 10,
              }, 100 + i * 60)}
            />
          ))}
        </div>
      </div>
      <div>
        <div style={bone({ height: 10, width: 72, borderRadius: 4, border: 'none', marginBottom: 14 }, 160)} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i}>
              <div style={bone({ aspectRatio: '1', width: '100%', borderRadius: 10, marginBottom: 8 }, 180 + i * 50)} />
              <div style={bone({ height: 10, width: '80%', borderRadius: 4, border: 'none', marginBottom: 6 }, 200 + i * 50)} />
              <div style={bone({ height: 8, width: '55%', borderRadius: 4, border: 'none' }, 220 + i * 50)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Alerts: avatar + two text lines. */
export function NotificationRowSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PulseStyle />
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 4px',
            minHeight: 'var(--margo-touch-min)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={bone({ width: 40, height: 40, borderRadius: '50%', border: 'none', flexShrink: 0 }, i * 50)} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={bone({ height: 11, width: '72%', borderRadius: 4, border: 'none' }, i * 50 + 30)} />
            <div style={bone({ height: 9, width: '40%', borderRadius: 4, border: 'none' }, i * 50 + 60)} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Landing exchange card while featured/ticker is settling. */
export function LandingExchangeSkeleton() {
  return (
    <div style={bone({ width: '100%', borderRadius: 16, padding: '28px 24px' }, 0)}>
      <PulseStyle />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div style={bone({ height: 16, width: '88%', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.07)' }, 40)} />
        <div style={bone({ height: 16, width: '70%', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.07)' }, 80)} />
      </div>
      <div style={bone({ height: 1, width: '100%', border: 'none', background: 'rgba(255,255,255,0.08)', marginBottom: 20 }, 100)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={bone({ height: 16, width: '82%', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.07)' }, 120)} />
        <div style={bone({ height: 16, width: '64%', borderRadius: 4, border: 'none', background: 'rgba(255,255,255,0.07)' }, 160)} />
      </div>
    </div>
  )
}

/**
 * Signed-in / identity-resolving visitors on /.
 * Neutral copy — used for first load and Feed redirect (not Feed-only).
 */
export function LandingRedirectSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <PulseStyle />
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-10rem',
            left: '-10rem',
            width: '22rem',
            height: '22rem',
            background: 'rgba(232,197,71,0.05)',
            borderRadius: '50%',
            filter: 'blur(120px)',
          }}
        />
      </div>
      <main
        style={{
          position: 'relative',
          zIndex: 5,
          maxWidth: 720,
          margin: '0 auto',
          padding: '88px 24px var(--margo-page-padding-bottom)',
        }}
      >
        <p
          style={{
            fontFamily: font,
            fontStyle: 'italic',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: 28,
            textAlign: 'center',
          }}
        >
          Loading…
        </p>
        <FeedPostSkeletonList count={3} />
      </main>
    </div>
  )
}

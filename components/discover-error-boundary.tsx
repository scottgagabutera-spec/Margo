'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import Link from 'next/link'

const font = 'var(--font-lora), serif'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Keeps Discover-route render failures from unmounting root chrome
 * (MobileTabBar, AudioEngineProvider, nav). Complements useSongs try/catch —
 * error boundaries do not catch useEffect throws, so Realtime setup must
 * also fail soft inside the hook.
 */
export class DiscoverErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DiscoverErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px calc(48px + var(--margo-tabbar-h, 0px))',
            textAlign: 'center',
            background: 'var(--bg)',
          }}
        >
          <p
            style={{
              fontFamily: font,
              fontStyle: 'italic',
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Discover hit a snag.
          </p>
          <p
            style={{
              fontFamily: font,
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              maxWidth: '280px',
            }}
          >
            Your feed and music controls are still here — try again or head back.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '240px' }}>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              style={{
                minHeight: 'var(--margo-touch-min)',
                padding: '0 24px',
                border: 'none',
                borderRadius: '50px',
                background: 'var(--gold)',
                color: 'var(--text-on-gold, var(--bg))',
                fontFamily: font,
                fontWeight: 700,
                fontSize: '0.6rem',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <Link
              href="/feed"
              style={{
                minHeight: 'var(--margo-touch-min)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 24px',
                borderRadius: '50px',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontFamily: font,
                fontSize: '0.6rem',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Back to Feed
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

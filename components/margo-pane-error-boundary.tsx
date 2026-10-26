'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '@/lib/observability/report-error'

type Props = {
  children: ReactNode
  surface: string
}

type State = {
  error: (Error & { digest?: string }) | null
}

export class MargoPaneErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error & { digest?: string }): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, {
      surface: this.props.surface,
      componentStack: info.componentStack ?? null,
      digest: (error as Error & { digest?: string }).digest ?? null,
    })
  }

  render() {
    const { error } = this.state
    if (error) {
      const ref = error.digest || error.message?.slice(0, 12) || 'pane-error'
      return (
        <div
          role="alert"
          style={{
            padding: '48px 20px',
            textAlign: 'center',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            This section could not load. Try again or switch tabs.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Retry
          </button>
          <p style={{
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            margin: '14px 0 0',
            fontFamily: 'ui-monospace, monospace',
          }}>
            Ref: {ref}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

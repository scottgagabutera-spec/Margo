'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; onReset?: () => void }
type State = { error: Error | null }

/** Keeps Lyric Back failures off the full-page error boundary. */
export class LyricBackErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LyricBackErrorBoundary', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="margo-post-detail-lb margo-post-detail-lb--error" role="alert">
          <p className="margo-post-detail-lb__error-text">
            Lyric Backs couldn&apos;t open. Try again.
          </p>
          <button
            type="button"
            className="margo-post-card__lb-focus-back"
            onClick={() => {
              this.setState({ error: null })
              this.props.onReset?.()
            }}
          >
            Retry Lyric Back
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

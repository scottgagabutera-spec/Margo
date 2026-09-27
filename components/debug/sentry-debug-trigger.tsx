'use client'

import { useState } from 'react'
import { SENTRY_E2E_TEST_MESSAGE } from '@/lib/observability/sentry-test-constants'
import { TYPE, UI_FONT } from '@/lib/fonts'

export function SentryDebugTrigger() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [detail, setDetail] = useState<string | null>(null)

  async function runTest() {
    setStatus('loading')
    setDetail(null)
    const token = new URLSearchParams(window.location.search).get('token') || ''
    try {
      const res = await fetch('/api/debug/sentry-test', {
        method: 'POST',
        headers: { 'x-margo-sentry-test': token },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setDetail(body.error || `HTTP ${res.status}`)
        return
      }
      setStatus('done')
      setDetail(body.eventId ? `Event ID: ${body.eventId}` : 'Sent (no event id returned)')
    } catch {
      setStatus('error')
      setDetail('Network error')
    }
  }

  return (
    <div style={{
      maxWidth: '360px',
      width: '100%',
      padding: '24px',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      textAlign: 'center',
      fontFamily: UI_FONT,
    }}>
      <p style={{ fontSize: TYPE.label, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 8px' }}>
        Internal
      </p>
      <p style={{ fontSize: TYPE.secondary, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.45 }}>
        Sends one test error to Sentry ({SENTRY_E2E_TEST_MESSAGE}).
      </p>
      <button
        type="button"
        onClick={() => void runTest()}
        disabled={status === 'loading'}
        style={{
          minHeight: 'var(--margo-touch-min)',
          padding: '0 20px',
          borderRadius: '999px',
          border: 'none',
          background: 'var(--gold)',
          color: 'var(--bg)',
          fontWeight: 700,
          fontSize: TYPE.label,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: status === 'loading' ? 'wait' : 'pointer',
          opacity: status === 'loading' ? 0.7 : 1,
        }}
      >
        {status === 'loading' ? 'Sending…' : 'Send test error'}
      </button>
      {detail ? (
        <p style={{ fontSize: TYPE.meta, color: status === 'error' ? 'var(--text-secondary)' : 'var(--gold)', margin: '16px 0 0', wordBreak: 'break-word' }}>
          {detail}
        </p>
      ) : null}
    </div>
  )
}

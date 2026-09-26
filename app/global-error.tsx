'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/observability/report-error'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { surface: 'global-error', digest: error.digest ?? null })
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: 'var(--bg, #0a0a0a)', color: 'var(--text, #f5f5f5)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '420px', margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.85 }}>
            Something went wrong. Try again — we&apos;ve been notified.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}

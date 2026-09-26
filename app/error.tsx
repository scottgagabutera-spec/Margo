'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/observability/report-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { surface: 'app-error', digest: error.digest ?? null })
  }, [error])

  return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Something went wrong loading this page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            borderRadius: '999px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: '0.82rem',
          }}
        >
          Try again
        </button>
      </div>
    </main>
  )
}

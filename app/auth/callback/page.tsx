'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingRing } from '@/components/loading-ring'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useIdentity } from '@/hooks/useIdentity'
import { UI_FONT } from '@/lib/fonts'

const ui = UI_FONT

function parseCallbackError(code: string | null): string | null {
  if (!code) return null
  if (code === 'access_denied') return 'Sign-in was cancelled. Please try again.'
  return 'Sign-in was interrupted. Please try again.'
}

function OAuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { rehydrate } = useAuthGate()
  const { waitUntilReady } = useIdentity()
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const providerError = parseCallbackError(searchParams.get('error'))
    if (providerError) {
      setError(providerError)
      return
    }

    const code = searchParams.get('code')
    if (!code) {
      setError('Sign-in was interrupted. Please try again.')
      return
    }

    void (async () => {
      try {
        const res = await fetch('/api/auth/oauth/complete', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const body = await res.json().catch(() => ({})) as { redirectTo?: string }
        const redirectTo = typeof body.redirectTo === 'string' && body.redirectTo.startsWith('/')
          ? body.redirectTo
          : '/feed'
        await rehydrate()
        await waitUntilReady()
        router.replace(redirectTo)
      } catch {
        setError('Sign-in was interrupted. Please try again.')
      }
    })()
  }, [rehydrate, router, searchParams, waitUntilReady])

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      {error ? null : (
        <div role="status" aria-label="Loading">
          <LoadingRing size={36} strokeWidth={2} state="spinning" />
        </div>
      )}
      {error ? (
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <p role="alert" style={{
            fontFamily: ui,
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            margin: '0 0 18px',
          }}>
            {error}
          </p>
          <a
            href="/signin"
            style={{
              fontFamily: ui,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--gold)',
              textDecoration: 'none',
            }}
          >
            Back to sign in
          </a>
        </div>
      ) : null}
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }} />
    }>
      <OAuthCallbackInner />
    </Suspense>
  )
}

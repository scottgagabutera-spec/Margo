'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MargoLogo from '@/components/MargoLogo'
import { LoadingRing } from '@/components/loading-ring'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { UI_FONT } from '@/lib/fonts'

const ui = UI_FONT
const lora = 'var(--font-lora), serif'

function parseCallbackError(code: string | null): string | null {
  if (!code) return null
  if (code === 'access_denied') return 'Sign-in was cancelled. Please try again.'
  return 'Sign-in was interrupted. Please try again.'
}

function OAuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { rehydrate } = useAuthGate()
  const startedRef = useRef(false)
  const [status, setStatus] = useState('Signing you in…')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const providerError = parseCallbackError(searchParams.get('error'))
    if (providerError) {
      setError(providerError)
      setStatus('Could not finish sign-in')
      return
    }

    const code = searchParams.get('code')
    if (!code) {
      setError('Sign-in was interrupted. Please try again.')
      setStatus('Could not finish sign-in')
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
        router.replace(redirectTo)
      } catch {
        setError('Sign-in was interrupted. Please try again.')
        setStatus('Could not finish sign-in')
      }
    })()
  }, [rehydrate, router, searchParams])

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
      <MargoLogo tier="lockup" size={36} rings />
      <div style={{ marginTop: '28px' }}>
        {error ? null : <LoadingRing size={36} strokeWidth={2} state="spinning" />}
      </div>
      <p
        role="status"
        aria-live="polite"
        style={{
          margin: '18px 0 0',
          fontFamily: lora,
          fontStyle: 'italic',
          fontSize: '1.05rem',
          color: 'var(--text)',
          textAlign: 'center',
        }}
      >
        {status}
      </p>
      {error ? (
        <div style={{ marginTop: '16px', textAlign: 'center', maxWidth: '320px' }}>
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

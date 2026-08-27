'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthGate } from '@/components/supabase-auth-provider'
import {
  CONSENT_REQUIRED_MESSAGE,
  PolicyLinks,
  SignupConsentCheckbox,
} from '@/components/signup-legal-notice'

const lora = 'var(--font-lora), serif'
const ui = 'var(--font-geist-sans), system-ui, sans-serif'

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 14px',
  background: 'var(--gold)',
  color: 'var(--text-on-gold, var(--bg))',
  border: 'none',
  borderRadius: '50px',
  fontFamily: ui,
  fontWeight: 600,
  fontSize: '0.78rem',
  letterSpacing: '0.2px',
}

/**
 * Non-dismissible fallback gate when an authenticated user reaches the app
 * without recorded Margo terms acceptance. Defense-in-depth behind proxy.ts.
 */
export function LegalConsentGateModal() {
  const { rehydrate } = useAuthGate()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError(CONSENT_REQUIRED_MESSAGE)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptedTerms: true }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || 'Something went wrong. Please try again.')
      }
      await rehydrate()
      toast.success('Welcome to Margo.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const disabled = loading || !termsAccepted

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-consent-gate-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(7,6,10,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '36px 28px 28px',
          boxSizing: 'border-box',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <header style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2
            id="legal-consent-gate-title"
            style={{
              fontFamily: lora,
              fontSize: '1.35rem',
              color: 'var(--text)',
              fontWeight: 400,
              margin: '0 0 14px',
            }}
          >
            Review and accept Margo&apos;s policies
          </h2>
          <p style={{
            fontFamily: ui,
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.55,
          }}>
            Before you continue using Margo, please review and accept our <PolicyLinks />.
          </p>
        </header>

        <div style={{ marginBottom: '20px' }}>
          <SignupConsentCheckbox
            id="legal-consent-gate-checkbox"
            checked={termsAccepted}
            onChange={setTermsAccepted}
            disabled={loading}
          />
        </div>

        {error ? (
          <p role="alert" style={{
            fontFamily: ui,
            fontSize: '0.78rem',
            color: '#ff7070',
            margin: '0 0 16px',
            lineHeight: 1.45,
          }}>
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => { void handleSubmit() }}
          disabled={disabled}
          style={{
            ...primaryBtnStyle,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {loading ? 'Saving…' : 'Continue to Margo'}
        </button>
      </div>
    </div>
  )
}

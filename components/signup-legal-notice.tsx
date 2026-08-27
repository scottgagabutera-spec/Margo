'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

const lora = 'var(--font-lora), serif'
const ui = 'var(--font-geist-sans), system-ui, sans-serif'

export const CONSENT_REQUIRED_MESSAGE =
  'Please agree to the Terms of Service and Privacy Policy.'

const linkStyle: React.CSSProperties = {
  color: 'var(--gold)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

function PolicyLinks() {
  return (
    <>
      <Link href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        Terms of Service
      </Link>
      {' '}and{' '}
      <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        Privacy Policy
      </Link>
    </>
  )
}

interface SignupConsentCheckboxProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function SignupConsentCheckbox({
  id = 'signup-consent',
  checked,
  onChange,
  disabled = false,
}: SignupConsentCheckboxProps) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        margin: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: '18px',
          height: '18px',
          minWidth: '18px',
          minHeight: '18px',
          marginTop: '2px',
          flexShrink: 0,
          accentColor: 'var(--gold)',
        }}
      />
      <span style={{
        fontFamily: lora,
        fontSize: '0.74rem',
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
      }}>
        I agree to the <PolicyLinks />.
      </span>
    </label>
  )
}

interface SignupConsentIntroProps {
  children?: ReactNode
}

/** Create-account first step — review before choosing signup method. */
export function SignupConsentIntro({ children }: SignupConsentIntroProps) {
  return (
    <p style={{
      fontFamily: ui,
      fontSize: '0.82rem',
      lineHeight: 1.55,
      color: 'var(--text-secondary)',
      margin: '0 0 14px',
    }}>
      {children ?? (
        <>
          First, please review and accept our <PolicyLinks />.
        </>
      )}
    </p>
  )
}

interface SignupConsentGateProps {
  highlight: boolean
  children: ReactNode
}

/**
 * Subtle short attention cue on first visit to Create account — not an alarm.
 * Respects prefers-reduced-motion (see styled-jsx below).
 */
export function SignupConsentGate({ highlight, children }: SignupConsentGateProps) {
  return (
    <div
      className={highlight ? 'margo-consent-gate margo-consent-gate--attention' : 'margo-consent-gate'}
      style={{ marginBottom: '20px' }}
    >
      <style jsx>{`
        .margo-consent-gate {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px 14px 12px;
          box-sizing: border-box;
        }
        @keyframes margo-consent-attention {
          0%, 100% {
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 0 rgba(232, 197, 71, 0);
          }
          50% {
            border-color: rgba(232, 197, 71, 0.32);
            box-shadow: 0 0 0 1px rgba(232, 197, 71, 0.14);
          }
        }
        .margo-consent-gate--attention {
          animation: margo-consent-attention 2.4s ease-in-out 3;
        }
        @media (prefers-reduced-motion: reduce) {
          .margo-consent-gate--attention {
            animation: none;
            border-color: rgba(232, 197, 71, 0.28);
          }
        }
      `}</style>
      {children}
    </div>
  )
}

/** Body copy for /signin?step=terms — new OAuth account via Sign in. */
export function TermsCompletionIntro() {
  return (
    <p style={{
      fontFamily: ui,
      fontSize: '0.82rem',
      color: 'var(--text-secondary)',
      margin: 0,
      lineHeight: 1.55,
    }}>
      To finish creating your Margo account, please review and accept our <PolicyLinks />.
    </p>
  )
}

'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { CONSENT_REQUIRED_MESSAGE, CONSENT_REQUIRED_SHORT } from '@/lib/legal/consent-copy'
import { TYPE, UI_FONT } from '@/lib/fonts'

const ui = UI_FONT

export { CONSENT_REQUIRED_MESSAGE, CONSENT_REQUIRED_SHORT }

/** Short red alert under the terms block — legal checkbox text unchanged. */
export function ConsentRequiredAlert({ message = CONSENT_REQUIRED_SHORT }: { message?: string }) {
  return (
    <p
      role="alert"
      className="margo-consent-alert"
      style={{
        fontFamily: ui,
        fontSize: TYPE.meta,
        color: 'var(--destructive)',
        margin: '8px 0 0',
        lineHeight: 1.35,
        wordBreak: 'break-word',
      }}
    >
      {message}
    </p>
  )
}

const linkStyle: React.CSSProperties = {
  color: 'var(--gold)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

export function PolicyLinks() {
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
        minWidth: 0,
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
        fontFamily: ui,
        fontSize: TYPE.secondary,
        lineHeight: 1.45,
        color: 'var(--text-secondary)',
        wordBreak: 'break-word',
        minWidth: 0,
      }}>
        I have read and agree to the <PolicyLinks />.
      </span>
    </label>
  )
}

interface SignupConsentIntroProps {
  children?: ReactNode
}

/** Optional intro — same legal sentence as checkbox (duplicate; see report). */
export function SignupConsentIntro({ children }: SignupConsentIntroProps) {
  const text = children ?? CONSENT_REQUIRED_MESSAGE
  return (
    <p
      className="margo-consent-intro"
      style={{
        fontFamily: ui,
        fontSize: TYPE.meta,
        lineHeight: 1.35,
        color: 'var(--text-muted)',
        margin: '0 0 10px',
        wordBreak: 'break-word',
        minWidth: 0,
      }}
    >
      {text}
    </p>
  )
}

interface SignupConsentGateProps {
  highlight: boolean
  children: ReactNode
  consentError?: boolean
}

export function SignupConsentGate({ highlight, children, consentError }: SignupConsentGateProps) {
  return (
    <div
      className={highlight ? 'margo-consent-gate margo-consent-gate--attention' : 'margo-consent-gate'}
      style={{
        marginBottom: '12px',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      <style jsx>{`
        .margo-consent-gate {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px 14px 12px;
          box-sizing: border-box;
          max-width: 100%;
          overflow: hidden;
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
      {consentError ? <ConsentRequiredAlert /> : null}
    </div>
  )
}

/** Body copy for /signin?step=terms — new OAuth account via Sign in. */
export function TermsCompletionIntro() {
  return (
    <p style={{
      fontFamily: ui,
      fontSize: TYPE.secondary,
      color: 'var(--text-secondary)',
      margin: 0,
      lineHeight: 1.45,
      wordBreak: 'break-word',
    }}>
      Accept our <PolicyLinks /> to finish.
    </p>
  )
}

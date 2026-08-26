'use client'

import Link from 'next/link'

const font = 'var(--font-lora), serif'

const linkStyle: React.CSSProperties = {
  color: 'var(--gold)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

interface SignupConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function SignupConsentCheckbox({
  checked,
  onChange,
  disabled = false,
}: SignupConsentCheckboxProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '20px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: '18px',
          height: '18px',
          marginTop: '2px',
          flexShrink: 0,
          accentColor: 'var(--gold)',
        }}
      />
      <span style={{
        fontFamily: font,
        fontSize: '0.78rem',
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
      }}>
        I agree to Margo&apos;s{' '}
        <Link href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          Terms of Service
        </Link>{' '}
        and acknowledge that I have read the{' '}
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  )
}

interface SignupLegalSummaryProps {
  style?: React.CSSProperties
}

/** Short reminder above OAuth on create-account — checkbox is still required. */
export function SignupLegalSummary({ style }: SignupLegalSummaryProps) {
  return (
    <p style={{
      fontFamily: font,
      fontSize: '0.72rem',
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      margin: '0 0 12px',
      ...style,
    }}>
      Creating an account means you agree to our policies. Review the{' '}
      <Link href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>Terms</Link>
      {' '}and{' '}
      <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>Privacy Policy</Link>
      {' '}before continuing.
    </p>
  )
}

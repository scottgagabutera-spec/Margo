'use client'

import Link from 'next/link'

const font = 'var(--font-lora), serif'

const linkStyle: React.CSSProperties = {
  color: 'var(--gold)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
}

interface SignupLegalNoticeProps {
  style?: React.CSSProperties
}

/**
 * Shown on signup paths only. The deliberate tap on Sign Up / OAuth after
 * reading this notice is treated as agreement to the Terms and acknowledgment
 * of the Privacy Policy — no pre-checked optional boxes.
 */
export function SignupLegalNotice({ style }: SignupLegalNoticeProps) {
  return (
    <p
      style={{
        fontFamily: font,
        fontSize: '0.72rem',
        lineHeight: 1.55,
        color: 'var(--text-secondary)',
        margin: '0 0 16px',
        ...style,
      }}
    >
      By creating an account, you agree to Margo&apos;s{' '}
      <Link href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        Terms of Service
      </Link>{' '}
      and acknowledge our{' '}
      <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        Privacy Policy
      </Link>
      .
    </p>
  )
}

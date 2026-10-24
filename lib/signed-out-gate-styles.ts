import type { CSSProperties } from 'react'

/** Primary gold CTA — matches main app actions (44px touch, focus via link focus-visible). */
export const signedOutGateSignInStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 'var(--margo-touch-min)',
  padding: '0 28px',
  background: 'var(--gold)',
  color: 'var(--bg)',
  borderRadius: '50px',
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '0.75rem',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  textDecoration: 'none',
  border: 'none',
  boxSizing: 'border-box',
}

export const signedOutGateBenefitStyle: CSSProperties = {
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.45,
  margin: '0 0 20px',
  maxWidth: '320px',
  marginLeft: 'auto',
  marginRight: 'auto',
}

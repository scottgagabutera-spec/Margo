'use client'

import { useId, useState } from 'react'
import {
  AUTH_PASSWORD_REQUIREMENTS_SHORT,
  passwordStrengthHint,
  passwordStrengthLabel,
  passwordStrengthMeterColor,
  passwordStrengthSegments,
  validatePassword,
  type PasswordStrength,
} from '@/lib/auth-password-policy'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { scrollAuthFieldIntoView } from '@/components/auth-viewport'

const ui = UI_FONT

interface AuthPasswordFieldProps {
  value: string
  disabled?: boolean
  autoComplete: string
  error?: string | null
  showRequirements?: boolean
  showMeter?: boolean
  label?: string
  forgotPasswordSlot?: React.ReactNode
  /** Shown beside the error line (e.g. resend confirmation). */
  errorAddon?: React.ReactNode
  /** Green check when passwords match (confirm field only). */
  matchOk?: boolean
  onFocus?: () => void
  onChange: (value: string) => void
  onEnter?: () => void
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-4.1 5.2M6.7 6.7A18 18 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.9-1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function StrengthMeter({ strength }: { strength: PasswordStrength }) {
  const filled = passwordStrengthSegments(strength)
  const color = passwordStrengthMeterColor(strength)
  const label = passwordStrengthLabel(strength)
  if (!label) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', gap: '4px', flex: 1, minWidth: 0 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              background: i < filled ? color : 'var(--border)',
              transition: 'background 120ms ease',
            }}
          />
        ))}
      </div>
      <span style={{
        fontFamily: ui,
        fontSize: TYPE.meta,
        color,
        flexShrink: 0,
        minWidth: '44px',
        textAlign: 'right',
      }}>
        {label}
      </span>
    </div>
  )
}

export function AuthPasswordField({
  value,
  disabled,
  autoComplete,
  error,
  showRequirements = true,
  showMeter = true,
  label = 'Password',
  forgotPasswordSlot,
  errorAddon,
  matchOk = false,
  onFocus,
  onChange,
  onEnter,
}: AuthPasswordFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const [visible, setVisible] = useState(false)
  const strength = passwordStrengthHint(value)
  const satisfied = validatePassword(value).ok

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <label htmlFor={id} style={{
        display: 'block',
        fontFamily: ui,
        fontSize: TYPE.label,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        marginBottom: '8px',
        fontWeight: 700,
      }}>
        {label}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          aria-describedby={showRequirements ? hintId : undefined}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            onFocus?.()
            scrollAuthFieldIntoView(e.currentTarget)
          }}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          className="margo-auth-input"
          style={{
            width: '100%',
            height: '44px',
            padding: '0 44px 0 14px',
            background: 'var(--surface-2)',
            border: `1px solid ${error ? 'var(--destructive)' : 'var(--border)'}`,
            borderRadius: '12px',
            color: 'var(--text)',
            fontFamily: ui,
            fontSize: TYPE.body,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '2px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <EyeIcon open={visible} />
        </button>
      </div>

      {showRequirements && !satisfied ? (
        <p id={hintId} style={{
          fontFamily: ui,
          fontSize: TYPE.meta,
          color: 'var(--text-muted)',
          margin: '8px 0 0',
          lineHeight: 1.25,
          wordBreak: 'break-word',
        }}>
          {AUTH_PASSWORD_REQUIREMENTS_SHORT}
        </p>
      ) : null}

      {showRequirements && satisfied && !matchOk ? (
        <p id={hintId} style={{
          fontFamily: ui,
          fontSize: TYPE.meta,
          color: 'var(--success)',
          margin: '8px 0 0',
          lineHeight: 1.25,
        }}>
          ✓
        </p>
      ) : null}

      {matchOk ? (
        <p style={{
          fontFamily: ui,
          fontSize: TYPE.meta,
          color: 'var(--success)',
          margin: '8px 0 0',
          lineHeight: 1.25,
        }}>
          ✓
        </p>
      ) : null}

      {showMeter && value && !matchOk ? <StrengthMeter strength={strength} /> : null}

      {forgotPasswordSlot ? (
        <div style={{ marginTop: '4px', textAlign: 'right' }}>{forgotPasswordSlot}</div>
      ) : null}

      {error ? (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 12px',
          alignItems: 'center',
          marginTop: '6px',
          minWidth: 0,
        }}>
          <p role="alert" style={{
            fontFamily: ui,
            fontSize: TYPE.meta,
            color: 'var(--destructive)',
            margin: 0,
            lineHeight: 1.35,
            wordBreak: 'break-word',
            minWidth: 0,
          }}>
            {error}
          </p>
          {errorAddon}
        </div>
      ) : null}
    </div>
  )
}

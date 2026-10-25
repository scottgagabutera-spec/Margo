'use client'

import { useId } from 'react'
import {
  AUTH_PASSWORD_REQUIREMENTS_LINE,
  passwordStrengthHint,
  passwordStrengthLabel,
  type PasswordStrength,
} from '@/lib/auth-password-policy'
import { TYPE, UI_FONT } from '@/lib/fonts'

const ui = UI_FONT

interface AuthPasswordFieldProps {
  value: string
  disabled?: boolean
  autoComplete: string
  error?: string | null
  showRequirements?: boolean
  onChange: (value: string) => void
  onEnter?: () => void
}

function strengthColor(strength: PasswordStrength): string {
  if (strength === 'strong') return 'var(--success)'
  if (strength === 'fair') return 'var(--text-secondary)'
  if (strength === 'weak' || strength === 'too_short') return 'var(--destructive)'
  return 'var(--text-muted)'
}

export function AuthPasswordField({
  value,
  disabled,
  autoComplete,
  error,
  showRequirements = true,
  onChange,
  onEnter,
}: AuthPasswordFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const strength = passwordStrengthHint(value)
  const hint = passwordStrengthLabel(strength)

  return (
    <div>
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
        Password
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-describedby={showRequirements ? hintId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        className="margo-auth-input"
        style={{
          width: '100%',
          height: '44px',
          padding: '0 14px',
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
      {showRequirements ? (
        <p id={hintId} style={{
          fontFamily: ui,
          fontSize: TYPE.meta,
          color: 'var(--text-muted)',
          margin: '8px 0 0',
          lineHeight: 1.35,
        }}>
          {AUTH_PASSWORD_REQUIREMENTS_LINE}
          {hint ? (
            <span style={{ color: strengthColor(strength), marginLeft: hint ? '6px' : 0 }}>
              {hint}
            </span>
          ) : null}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{
          fontFamily: ui,
          fontSize: TYPE.meta,
          color: 'var(--destructive)',
          margin: '6px 0 0',
          lineHeight: 1.35,
        }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

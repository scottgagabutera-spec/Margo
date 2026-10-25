'use client'

import { useCallback, useId, useRef } from 'react'
import { TYPE, UI_FONT } from '@/lib/fonts'
import { scrollAuthFieldIntoView } from '@/components/auth-viewport'

const ui = UI_FONT
const DIGITS = 8

interface AuthRecoveryCodeInputProps {
  value: string
  disabled?: boolean
  error?: string | null
  onChange: (value: string) => void
}

export function AuthRecoveryCodeInput({
  value,
  disabled,
  error,
  onChange,
}: AuthRecoveryCodeInputProps) {
  const groupId = useId()
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.padEnd(DIGITS, ' ').slice(0, DIGITS).split('')

  const emit = useCallback((next: string) => {
    onChange(next.replace(/\D/g, '').slice(0, DIGITS))
  }, [onChange])

  const focusIndex = (index: number) => {
    const el = refs.current[index]
    if (el) {
      el.focus()
      scrollAuthFieldIntoView(el)
    }
  }

  const handlePaste = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, DIGITS)
    emit(cleaned)
    focusIndex(Math.min(cleaned.length, DIGITS - 1))
  }

  return (
    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <div
        role="group"
        aria-labelledby={groupId}
        style={{
          display: 'flex',
          gap: '6px',
          width: '100%',
          minWidth: 0,
          justifyContent: 'space-between',
        }}
      >
        <span id={groupId} style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}>
          8-digit code
        </span>
        {digits.map((char, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            value={char.trim()}
            aria-invalid={error ? true : undefined}
            onFocus={(e) => scrollAuthFieldIntoView(e.currentTarget)}
            onPaste={(e) => {
              e.preventDefault()
              handlePaste(e.clipboardData.getData('text'))
            }}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              if (!v) {
                const next = value.slice(0, i) + value.slice(i + 1)
                emit(next)
                if (i > 0) focusIndex(i - 1)
                return
              }
              const next =
                value.slice(0, i) + v.slice(-1) + value.slice(i + 1)
              emit(next.replace(/\D/g, '').slice(0, DIGITS))
              if (v && i < DIGITS - 1) focusIndex(i + 1)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !char.trim() && i > 0) {
                e.preventDefault()
                focusIndex(i - 1)
              }
            }}
            className="margo-auth-input"
            style={{
              flex: '1 1 0',
              minWidth: 0,
              maxWidth: '44px',
              height: '44px',
              padding: 0,
              textAlign: 'center',
              background: 'var(--surface-2)',
              border: `1px solid ${error ? 'var(--danger, #c44)' : 'var(--border)'}`,
              borderRadius: '10px',
              color: 'var(--text)',
              fontFamily: ui,
              fontSize: TYPE.body,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" style={{
          fontFamily: ui,
          fontSize: TYPE.secondary,
          color: 'var(--danger, #e88)',
          margin: '10px 0 0',
          lineHeight: 1.4,
        }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const RECOVERY_CODE_LENGTH = DIGITS

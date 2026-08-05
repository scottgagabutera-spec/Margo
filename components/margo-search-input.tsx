'use client'

import { CloseIcon } from '@/components/icons'

const font = 'var(--font-lora), serif'

interface MargoSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Optional class for focus styles / tests */
  className?: string
  ariaLabel?: string
}

/**
 * Shared pill search field — Discover / Feed / catalog pattern.
 * 44px touch height, CSS variables only (Brand §14 Rule 2, §15 Pattern 2).
 */
export function MargoSearchInput({
  value,
  onChange,
  placeholder,
  className = 'margo-search',
  ariaLabel,
}: MargoSearchInputProps) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        className={className}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        enterKeyHint="search"
        style={{
          width: '100%',
          height: 'var(--margo-touch-min)',
          padding: '0 44px 0 16px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-hi)',
          borderRadius: '50px',
          color: 'var(--text)',
          fontFamily: font,
          fontSize: '0.82rem',
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 200ms ease',
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 'var(--margo-touch-min)',
            height: 'var(--margo-touch-min)',
            borderRadius: '50%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <CloseIcon size={14} color="var(--text-3)" />
        </button>
      ) : null}
    </div>
  )
}

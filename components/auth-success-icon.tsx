'use client'

/** Green success tick for auth confirmation screens. */
export function AuthSuccessIcon({ size = 40 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        margin: '0 auto 16px',
        borderRadius: '50%',
        background: 'var(--success-faint, rgba(34, 197, 94, 0.12))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="var(--success, #22c55e)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

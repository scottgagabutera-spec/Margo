'use client'

/**
 * Margo Symbol — circle + M-waveform + dash. Static mark for loaders,
 * pull-to-refresh, and compact brand moments. Wordmark lives in MargoLogo.
 */
export interface MargoSymbolProps {
  size?: number
  /** Gold fill on dark surfaces (default). */
  variant?: 'gold' | 'ink'
  className?: string
  style?: React.CSSProperties
}

export function MargoSymbol({
  size = 24,
  variant = 'gold',
  className,
  style,
}: MargoSymbolProps) {
  const fill = variant === 'gold' ? 'var(--gold)' : 'var(--bg)'
  const stroke = variant === 'gold' ? 'var(--bg)' : 'var(--gold)'

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="-4 -4 88 88"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <circle cx="40" cy="40" r="36" fill={fill} />
      <path
        d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
        fill="none"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill={stroke} opacity=".55" />
    </svg>
  )
}

/** SVG-only Shorts chrome icons (no emoji). */

export function ShortsMuteIcon({
  muted,
  size = 22,
  color = 'currentColor',
}: {
  muted: boolean
  size?: number
  color?: string
}) {
  const stroke = color
  const sw = 1.75
  return muted ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5L6 9H3v6h3l5 4V5z"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M16 9l5 5M21 9l-5 5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5L6 9H3v6h3l5 4V5z"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M15.5 8.5a4.5 4.5 0 010 7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M18 6a7.5 7.5 0 010 12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  )
}

export function ShortsCenterPlayIcon({
  size = 44,
  accent = 'var(--margo-shorts-chrome-icon, var(--gold))',
  scrim = 'var(--margo-shorts-chrome-scrim, rgba(8,7,12,0.42))',
}: {
  size?: number
  accent?: string
  scrim?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" fill={scrim} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      <path d="M20 15v18l14-9-14-9z" fill={accent} />
    </svg>
  )
}

export function ShortsCenterPauseIcon({
  size = 44,
  accent = 'var(--margo-shorts-chrome-icon, var(--gold))',
  scrim = 'var(--margo-shorts-chrome-scrim, rgba(8,7,12,0.42))',
}: {
  size?: number
  accent?: string
  scrim?: string
}) {
  const c = accent
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" fill={scrim} stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      <rect x="18" y="16" width="4.5" height="16" rx="1" fill={c} />
      <rect x="25.5" y="16" width="4.5" height="16" rx="1" fill={c} />
    </svg>
  )
}

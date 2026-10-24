/** SVG-only Shorts chrome icons (no emoji). */

export function ShortsMuteIcon({ muted, size = 20 }: { muted: boolean; size?: number }) {
  const c = 'var(--gold)'
  return muted ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 9l5 5M21 9l-5 5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15.5 8.5a4.5 4.5 0 010 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 6a7.5 7.5 0 010 12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function ShortsCenterPlayIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      <circle cx="28" cy="28" r="26" fill="rgba(8,7,12,0.45)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <path d="M23 18v20l16-10-16-10z" fill="var(--gold)" />
    </svg>
  )
}

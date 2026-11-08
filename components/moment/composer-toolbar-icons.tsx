'use client'

/** Sample-drawn toolbar icons (not Lucide). Stroke matches calm toolbar at ~1.75. */

const stroke = 'currentColor'

export function ComposerVibeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.75" />
      <circle cx="9" cy="10" r="1" fill={stroke} />
      <circle cx="15" cy="10" r="1" fill={stroke} />
      <path d="M8.5 14.5c1.2 1.4 2.8 2 3.5 2s2.3-.6 3.5-2" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function ComposerColorIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="10" r="5.5" stroke={stroke} strokeWidth="1.75" />
      <circle cx="15" cy="10" r="5.5" stroke={stroke} strokeWidth="1.75" />
      <circle cx="12" cy="15" r="5.5" stroke={stroke} strokeWidth="1.75" />
    </svg>
  )
}

export function ComposerEffectIcon({ size = 18, active }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13c2.5-2 4.5-2.5 7-2.5s4.5.5 7 2.5"
        stroke={active ? 'var(--gold)' : stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M17.5 6.5l1.5-.5.5 1.5-1.2.4-.8-1.4zM18.5 5.5l.6 1-.9.3-.3-1.3z"
        fill={active ? 'var(--gold)' : stroke}
      />
    </svg>
  )
}

export function ComposerFormatSquareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2.5" stroke={stroke} strokeWidth="1.75" />
    </svg>
  )
}

export function ComposerFormatStoryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="4" width="8" height="16" rx="2" stroke={stroke} strokeWidth="1.75" />
    </svg>
  )
}

export function ComposerDownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4v10" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8.5 11.5 12 15l3.5-3.5" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 19h12" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function ComposerShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 16V6" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8.5 9.5 12 6l3.5 3.5" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="15" width="14" height="5" rx="1.5" stroke={stroke} strokeWidth="1.75" />
    </svg>
  )
}

/** Card mode far-right control (replaces Post). */
export function ComposerStoryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="var(--bg)" strokeWidth="1.75" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="3" fill="var(--bg)" />
    </svg>
  )
}

export function ComposerPostArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 17V7" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 10.5 12 7l3.5 3.5" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

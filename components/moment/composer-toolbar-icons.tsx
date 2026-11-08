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

export function ComposerColorIcon({ size = 18, swatch = '#E8C547' }: { size?: number; swatch?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.75" />
      <circle cx="12" cy="12" r="4" fill={swatch} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
    </svg>
  )
}

export function ComposerEffectToolbarIcon({ size = 18, effectId = 'still' as const }: { size?: number; effectId?: 'still' | 'breath' | 'drift' | 'pulse' | 'weight' }) {
  const ink = effectId === 'still' ? stroke : 'var(--gold)'
  if (effectId === 'still') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7" stroke={ink} strokeWidth="1.75" />
        <path d="M8.5 12h7" stroke={ink} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    )
  }
  if (effectId === 'breath') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 14c2-3 4-4 6-4s4 1 6 4" stroke={ink} strokeWidth="1.75" strokeLinecap="round" />
        <path d="M8 9.5c1.2-2 2.8-3 4-3s2.8 1 4 3" stroke={ink} strokeWidth="1.5" strokeLinecap="round" opacity="0.65" />
      </svg>
    )
  }
  if (effectId === 'drift') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 10c2 .8 3.5 1 5.5 1s3.5-.2 5.5-1" stroke={ink} strokeWidth="1.75" strokeLinecap="round" />
        <path d="M6 14c2.2.9 3.8 1.2 6 1.2s3.8-.3 6-1.2" stroke={ink} strokeWidth="1.75" strokeLinecap="round" />
        <path d="M7 18c2.4 1 4.2 1.3 5 1.3s2.6-.3 5-1.3" stroke={ink} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    )
  }
  if (effectId === 'pulse') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12h3l1.5-4 2 8 2-5 1.5 3.5H19" stroke={ink} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v2M10 8c-1.2 1.5-1.5 3-1.5 4.5V17l1.5 2 2-2v-4.5C12 11 11.7 9.5 10 8" stroke={ink} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="19" r="1.25" fill={ink} />
    </svg>
  )
}

/** @deprecated use ComposerEffectToolbarIcon */
export function ComposerEffectIcon({ size = 18, active }: { size?: number; active?: boolean }) {
  return <ComposerEffectToolbarIcon size={size} effectId={active ? 'breath' : 'still'} />
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

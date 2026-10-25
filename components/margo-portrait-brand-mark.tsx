'use client'

/**
 * M-waveform mark for portrait brand tile — no outer circle (avoids frame crop).
 * Sized by parent; keep ~20% inset via `.margo-portrait-avatar__brand-inset`.
 */
export function MargoPortraitBrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="8 22 64 42"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
        fill="none"
        stroke="var(--gold)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="var(--gold)" opacity="0.55" />
    </svg>
  )
}

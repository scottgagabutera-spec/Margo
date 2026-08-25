'use client'

/**
 * MargoLogo — mark / symbol / lockup.
 * Wordmark: Sora 700, gold, letter-spacing 2px, uppercase.
 * Wordmark size scales with the symbol so lockups stay proportional.
 */
interface MargoLogoProps {
  tier?: 'mark' | 'symbol' | 'lockup'
  size?: number
  rings?: boolean
  wordmark?: boolean
  /** Wordmark only — no circular M mark (hero / search lockup). */
  wordmarkOnly?: boolean
}

export default function MargoLogo({
  tier = 'symbol',
  size = 32,
  rings = false,
  wordmark = false,
  wordmarkOnly = false,
}: MargoLogoProps) {
  // Scale wordmark with symbol: 28px → 14px, 36px → 18px (0.5 × mark)
  const wordmarkPx = Math.max(11, Math.round(size * 0.5))

  if (wordmarkOnly) {
    return (
      <span style={{
        fontFamily: 'var(--font-sora), sans-serif',
        fontWeight: 700,
        fontSize: `${wordmarkPx}px`,
        letterSpacing: '2px',
        color: '#E8C547',
        textTransform: 'uppercase',
        lineHeight: 1,
        display: 'inline-block',
      }}>
        MARGO
      </span>
    )
  }

  return (
    <>
      {rings && (
        <style>{`
          @keyframes margo-ring {
            0% { transform: scale(1); opacity: 0.2; }
            100% { transform: scale(1.7); opacity: 0; }
          }
          .margo-ring {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 1px solid #E8C547;
            animation: margo-ring 2.4s ease-out infinite;
            pointer-events: none;
          }
          .margo-ring-2 { animation-delay: 0.8s; }
          .margo-ring-3 { animation-delay: 1.6s; }
        `}</style>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: Math.max(6, Math.round(size * 0.25)) }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          {rings && (
            <>
              <span className="margo-ring" />
              <span className="margo-ring margo-ring-2" />
              <span className="margo-ring margo-ring-3" />
            </>
          )}
          <svg
            width={size}
            height={size}
            viewBox="-4 -4 88 88"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block', filter: 'drop-shadow(0 2px 8px rgba(232,197,71,0.25))' }}
          >
            <circle cx="40" cy="40" r="36" fill="#E8C547" />
            <path
              d="M17 57 L17 27 L29 45 L40 26 L51 45 L63 27 L63 57"
              fill="none"
              stroke="#0B0B0D"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {tier !== 'mark' && (
              <rect x="35" y="60" width="10" height="3.5" rx="1.75" fill="#0B0B0D" opacity=".55" />
            )}
          </svg>
        </div>
        {wordmark && (
          <span style={{
            fontFamily: 'var(--font-sora), sans-serif',
            fontWeight: 700,
            fontSize: `${wordmarkPx}px`,
            letterSpacing: '2px',
            color: '#E8C547',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            MARGO
          </span>
        )}
      </div>
    </>
  )
}

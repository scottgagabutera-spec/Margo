'use client'

interface MargoLogoProps {
  tier?: 'mark' | 'symbol' | 'lockup'
  size?: number
  rings?: boolean
  wordmark?: boolean
}

export default function MargoLogo({
  tier = 'symbol',
  size = 32,
  rings = false,
  wordmark = false,
}: MargoLogoProps) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            fontFamily: 'var(--font-syne), sans-serif',
            fontWeight: 800,
            fontSize: '0.75rem',
            letterSpacing: '3px',
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

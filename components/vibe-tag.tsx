'use client'

/** Small price-tag silhouette pinned to a card edge — vibe identity via stroke/fill color. */
export function VibeTag({
  label,
  color,
  onClick,
}: {
  label: string
  color: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      data-no-card-nav
      aria-label={`Vibe: ${label}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      style={{
        position: 'absolute',
        bottom: '-9px',
        right: '14px',
        zIndex: 4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '28px',
        padding: '0 2px 0 0',
        background: 'none',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-block', height: '22px' }}>
        <svg
          width="72"
          height="22"
          viewBox="0 0 72 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          style={{ display: 'block' }}
        >
          {/* Tag body: pointed left edge + rounded right, hole near tip */}
          <path
            d="M8 1 H64 Q71 1 71 8 V14 Q71 21 64 21 H8 L1 11 Z"
            fill={color}
            fillOpacity={0.14}
            stroke={color}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="11" r="2.2" fill="var(--bg)" stroke={color} strokeWidth="1.1" />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: '10px',
            fontFamily: 'var(--font-lora), serif',
            fontSize: '0.48rem',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      </span>
    </button>
  )
}

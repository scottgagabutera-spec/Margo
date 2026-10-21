/** Feed post-card icons — 24 viewBox, 20px render, 1.75 stroke, round caps (one family). */

type Props = { size?: number; className?: string }

const vb = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function FeedIconHeart({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.5-7 9-7 9z" />
    </svg>
  )
}

export function FeedIconHeartFilled({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb} fill="currentColor" stroke="none">
      <path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.5-7 9-7 9z" />
    </svg>
  )
}

export function FeedIconLyricBack({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <path d="M9 17H5v-4M5 17l4-4M5 17c2-5 6-7 11-7" />
    </svg>
  )
}

export function FeedIconCard({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  )
}

export function FeedIconReplay({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <path d="M6 8V5l-3 3 3 3V8a6 6 0 1 1-6 6" />
    </svg>
  )
}

export function FeedIconMore({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <circle cx="6" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FeedIconChevronRight({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function FeedIconLyricsLines({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <path d="M6 8h12M6 12h9M6 16h11" />
    </svg>
  )
}

export function FeedIconExternal({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} className={className} aria-hidden {...vb}>
      <path d="M14 5h5v5M10 14L19 5M19 5h-5M19 5v5" />
      <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </svg>
  )
}

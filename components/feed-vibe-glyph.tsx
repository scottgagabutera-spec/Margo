import type { FeedVibeGlyphId } from '@/lib/feed-vibe-map'

type Props = { id: FeedVibeGlyphId; size?: number; className?: string }

const stroke = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 16 16',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function FeedVibeGlyph({ id, size = 12, className }: Props) {
  switch (id) {
    case 'bolt':
      return (
        <svg width={size} height={size} className={className} aria-hidden {...stroke}>
          <path d="M9 1.5L4 9h3.5L7 14.5l5-7.5H8.5L9 1.5z" />
        </svg>
      )
    case 'star':
      return (
        <svg width={size} height={size} className={className} aria-hidden {...stroke}>
          <path d="M8 2l1.6 3.6L13.5 6.5 10.5 9.4 11.2 14 8 11.8 4.8 14l.7-4.6L2.5 6.5l3.9-.9L8 2z" />
        </svg>
      )
    case 'sun':
      return (
        <svg width={size} height={size} className={className} aria-hidden {...stroke}>
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" />
        </svg>
      )
    case 'wave':
      return (
        <svg width={size} height={size} className={className} aria-hidden {...stroke}>
          <path d="M1.5 10c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0" />
        </svg>
      )
    case 'spark':
      return (
        <svg width={size} height={size} className={className} aria-hidden {...stroke}>
          <path d="M8 2v4M8 10v4M2 8h4M10 8h4M4 4l2.5 2.5M9.5 9.5L12 12M12 4l-2.5 2.5M6.5 9.5L4 12" />
        </svg>
      )
    case 'heart':
      return (
        <svg width={size} height={size} className={className} aria-hidden {...stroke}>
          <path d="M8 13s-4.5-3-4.5-6a2.5 2.5 0 0 1 4.5-1.5A2.5 2.5 0 0 1 12.5 7C12.5 10 8 13 8 13z" />
        </svg>
      )
    default:
      return (
        <svg width={size} height={size} className={className} aria-hidden {...stroke}>
          <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        </svg>
      )
  }
}

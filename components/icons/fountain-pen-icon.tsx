import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/**
 * Fountain pen — Compose FAB (lyric write).
 * Tuned for ~18px: chunkier barrel, open nib wedge, tip-only short slit
 * (no full-length hairline that muddies at FAB scale).
 */
export function FountainPenIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M14.2 4.2c.85-.85 2.25-.85 3.1 0l2.5 2.5c.85.85.85 2.25 0 3.1L12 17.6 6.4 12 14.2 4.2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.4 12L4.5 19.2 12 17.6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.1 14.4L7.1 16.6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

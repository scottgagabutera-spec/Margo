import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/**
 * Pen + writing lines — Compose FAB (lyric write).
 * Tuned for ~18px: chunky barrel, open nib (no slit), two short lyric
 * strokes with clear gap so the FAB doesn’t read busy.
 */
export function PenLineIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
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
        d="M13.8 3.8c.8-.8 2.1-.8 2.9 0l2.2 2.2c.8.8.8 2.1 0 2.9L11.2 16.6 6.2 11.6 13.8 3.8Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 11.6L4.4 18.5 11.2 16.6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12.8 18.8H21"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 21.2H19.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

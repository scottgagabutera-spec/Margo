import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Reply / lyric-back — matches feed inline SVG */
export function LyricBackIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
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
        d="M9 14L4 9L9 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9H15C17.76 9 20 11.24 20 14V15C20 17.76 17.76 20 15 20H12"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

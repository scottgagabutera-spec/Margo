import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Lyric card export — matches feed inline SVG */
export function CardIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="3" y="3" width="12" height="16" rx="2" stroke={color} strokeWidth="1.5" />
      <path
        d="M9 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 8H13M7 11H13M7 14H10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Magnifier — stroke matches the shared icon set (1.5). */
export function SearchIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth="1.5" />
      <path d="M16 16L20.5 20.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

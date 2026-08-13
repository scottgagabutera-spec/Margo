import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Vertical shelves — Music Library (Hub tile + top-bar link). */
export function LibraryIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="4" y="5" width="4" height="14" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="10" y="5" width="4" height="14" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="16" y="5" width="4" height="14" rx="1" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Landscape photo + plus — add/change cover (not text CTAs). */
export function ImagePlusIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke={color} strokeWidth="1.5" />
      <path d="M3 16.5L8 12.5L11.5 15.5L15 11.5L21 16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.25" cy="9.5" r="1.25" stroke={color} strokeWidth="1.5" />
      <path d="M18 3.5V7.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 5.5H20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

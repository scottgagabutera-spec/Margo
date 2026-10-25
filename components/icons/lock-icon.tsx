import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Small lock — Hub tiles that require sign-in. */
export function LockIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.25" stroke={color} strokeWidth="1.25" />
      <path
        d="M5.5 7V5.25a2.75 2.75 0 0 1 5.5 0V7"
        stroke={color}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

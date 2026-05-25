import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** External / share — up-right arrow */
export function ShareIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
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
        d="M7 17L17 7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 7H17V15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

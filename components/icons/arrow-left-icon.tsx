import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

export function ArrowLeftIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
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
        d="M15 6L9 12L15 18"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12H19"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

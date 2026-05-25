import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

export function ChevronRightIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
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
        d="M9 6L15 12L9 18"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

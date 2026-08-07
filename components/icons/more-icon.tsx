import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Three-dot overflow trigger (•••). SVG only — no Unicode. */
export function MoreIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.75" fill={color} />
      <circle cx="12" cy="12" r="1.75" fill={color} />
      <circle cx="19" cy="12" r="1.75" fill={color} />
    </svg>
  )
}

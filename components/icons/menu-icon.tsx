import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Three-line menu — Vercel-toolbar class hamburger. */
export function MenuIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M5 7H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 17H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

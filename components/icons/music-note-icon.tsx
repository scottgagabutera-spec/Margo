import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** Placeholder when no lyric line is active — stroke quaver */
export function MusicNoteIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
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
        d="M14 5V14.2C14 16.43 12.43 18 10.2 18C7.97 18 6.4 16.43 6.4 14.2C6.4 11.97 7.97 10.4 10.2 10.4C11.09 10.4 11.9 10.72 12.55 11.25V5H18V3H12.55H14Z"
        fill={color}
      />
      <path
        d="M18 3V11.25"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

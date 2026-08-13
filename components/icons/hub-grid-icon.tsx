import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE, type MargoIconProps } from './icon-props'

/** 3×3 app grid — Hub chrome (tab + desktop trigger). */
export function HubGridIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  const cells = [6, 12, 18]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {cells.map((y) =>
        cells.map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x - 2}
            y={y - 2}
            width="4"
            height="4"
            rx="0.75"
            stroke={color}
            strokeWidth="1.5"
          />
        )),
      )}
    </svg>
  )
}

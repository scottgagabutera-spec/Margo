import type { MargoIconProps } from '@/components/icons/icon-props'
import { DEFAULT_ICON_COLOR, DEFAULT_ICON_SIZE } from '@/components/icons/icon-props'

export function PlusIcon({ size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }: MargoIconProps) {
  const stroke = Math.max(1.75, size * 0.12)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  )
}

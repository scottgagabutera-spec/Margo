'use client'

import { HeartFilledIcon } from '@/components/icons/heart-filled-icon'
import { HeartIcon as HeartOutlineIcon } from '@/components/icons/heart-icon'

/**
 * Compatibility wrapper — single heart family (icons/, stroke 1.5).
 * Prefer importing HeartIcon / HeartFilledIcon from @/components/icons.
 */
export function HeartIcon({
  filled,
  size = 16,
  color = 'currentColor',
}: {
  filled: boolean
  size?: number
  color?: string
}) {
  return filled
    ? <HeartFilledIcon size={size} color={color} />
    : <HeartOutlineIcon size={size} color={color} />
}

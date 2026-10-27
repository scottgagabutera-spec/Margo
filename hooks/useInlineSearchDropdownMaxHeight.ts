'use client'

import { useSearchBelowMaxHeight } from '@/hooks/useSearchBelowMaxHeight'

/** Compose / picker inline dropdown max-height while open. */
export function useInlineSearchDropdownMaxHeight(
  anchorRef: React.RefObject<HTMLElement | null>,
  open: boolean,
) {
  return useSearchBelowMaxHeight(anchorRef, open)
}

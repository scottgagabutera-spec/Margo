'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { StoriesDock } from '@/components/stories/stories-dock'
import { usePrimaryTab } from '@/components/primary-tab-shell'

/**
 * Stories mobile dock — portaled to document.body so primary-tab pane
 * visibility:hidden never clips it (regression fix).
 */
export function StoriesPortalDock({ onAddStory }: { onAddStory?: () => void }) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { isTabActive } = usePrimaryTab()
  const onFeed = pathname === '/feed' || isTabActive('feed')

  useEffect(() => setMounted(true), [])

  if (!mounted || !onFeed) return null

  return createPortal(
    <StoriesDock onAddStory={onAddStory} />,
    document.body,
  )
}

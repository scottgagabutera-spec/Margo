'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { trackFeedBlockImpression, trackFeedBlockTap } from '@/lib/analytics/feed-block'

export function FeedBlockShell({
  blockName,
  planKey,
  children,
  className,
}: {
  blockName: string
  planKey: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.4)) {
          trackFeedBlockImpression(blockName, planKey)
          io.disconnect()
        }
      },
      { threshold: [0.4] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [blockName, planKey])

  return (
    <section
      ref={ref}
      className={className}
      data-feed-block={blockName}
      data-plan-key={planKey}
      onClickCapture={() => trackFeedBlockTap(blockName, planKey)}
    >
      {children}
    </section>
  )
}

'use client'

import { Suspense, useCallback } from 'react'
import { MemoryCreateFlow } from '@/components/memory-create-flow'
import { EchoesAnswerFlow } from '@/components/echoes-answer-flow'
import { EchoesSetView } from '@/components/echoes-set-view'
import { EchoesPersonView } from '@/components/echoes-person-view'
import { useRegisterNavBack } from '@/components/nav-back'
import { closeFeedMix, type FeedMixSurface } from '@/lib/feed-mix-nav'
import { feedReturnFallbackHref } from '@/lib/feed-exit-nav'

export function FeedMixOverlay({ surface }: { surface: FeedMixSurface }) {
  const onClose = useCallback(() => {
    closeFeedMix()
  }, [])

  useRegisterNavBack({
    preferHistory: true,
    fallbackHref: feedReturnFallbackHref(),
    onBack: () => {
      onClose()
      return true
    },
  })

  return (
    <div className="margo-feed-mix-overlay" role="dialog" aria-modal="true">
      {surface.kind === 'create' ? (
        <MemoryCreateFlow
          onClose={onClose}
          launchEntry={surface.entry === 'memory' ? undefined : surface.entry}
          focusStory={surface.focusStory}
        />
      ) : null}
      {surface.kind === 'echoes-answer' ? (
        <Suspense fallback={null}>
          <EchoesAnswerFlow questionId={surface.questionId} setId={surface.setId} />
        </Suspense>
      ) : null}
      {surface.kind === 'echoes-set' ? <EchoesSetView setId={surface.setId} /> : null}
      {surface.kind === 'echoes-person' ? (
        <EchoesPersonView setId={surface.setId} profileId={surface.profileId} />
      ) : null}
    </div>
  )
}

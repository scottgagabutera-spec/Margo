'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { MemoryCreateFlow } from '@/components/memory-create-flow'
import { EchoesAnswerFlow } from '@/components/echoes-answer-flow'
import { EchoesSetView } from '@/components/echoes-set-view'
import { EchoesPersonView } from '@/components/echoes-person-view'
import { useRegisterNavBack } from '@/components/nav-back'
import { closeFeedMix, type FeedMixSurface } from '@/lib/feed-mix-nav'
import { feedReturnFallbackHref } from '@/lib/feed-exit-nav'
import type { MemoryPublic } from '@/lib/memory/types'
import { memoryCaptionTitle } from '@/lib/memory/display-caption'
import { memoryFeedThumbnailUrl } from '@/lib/memory/feed-thumbnail-url'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

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
          <EchoesAnswerFlow />
        </Suspense>
      ) : null}
      {surface.kind === 'echoes-set' ? <EchoesSetView setId={surface.setId} /> : null}
      {surface.kind === 'echoes-person' ? (
        <EchoesPersonView setId={surface.setId} profileId={surface.profileId} />
      ) : null}
      {surface.kind === 'memory' ? <FeedMemoryMixPane id={surface.id} onClose={onClose} /> : null}
    </div>
  )
}

function FeedMemoryMixPane({ id, onClose }: { id: string; onClose: () => void }) {
  const [memory, setMemory] = useState<MemoryPublic | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    const timer = window.setTimeout(() => ac.abort(), 8000)
    void (async () => {
      try {
        const res = await fetch(`/api/memories/${encodeURIComponent(id)}`, { signal: ac.signal })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError((data as { error?: string }).error || 'Not found')
          return
        }
        setMemory((data as { memory: MemoryPublic }).memory)
      } catch {
        setError('Not found')
      }
    })()
    return () => {
      window.clearTimeout(timer)
      ac.abort()
    }
  }, [id])

  const title = memory ? memoryCaptionTitle(memory) : ''
  const cover = memory ? memoryFeedThumbnailUrl(memory.coverUrl) : ''

  return (
    <div className="margo-feed-mix-memory">
      <button type="button" className="margo-feed-mix-memory__close" aria-label="Back" onClick={onClose}>
        Close
      </button>
      {error ? (
        <p className="margo-feed-mix-memory__err" style={{ fontFamily: font }}>
          {error}
        </p>
      ) : null}
      {memory ? (
        <>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="margo-feed-mix-memory__cover" />
          ) : null}
          <h1 className="margo-feed-mix-memory__title" style={{ fontFamily: font }}>
            {title}
          </h1>
          {memory.story ? (
            <p className="margo-feed-mix-memory__story" style={{ fontFamily: font }}>
              {memory.story}
            </p>
          ) : null}
        </>
      ) : !error ? (
        <p className="margo-feed-mix-memory__err" style={{ fontFamily: font }}>
          Loading
        </p>
      ) : null}
    </div>
  )
}

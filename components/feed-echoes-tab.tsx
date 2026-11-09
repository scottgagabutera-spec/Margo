'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { EchoesSongStrip } from '@/components/echoes-song-strip'
import { MargoAvatar } from '@/components/margo-avatar'
import type { EchoSongPayload } from '@/lib/echoes/types'
import { openFeedEchoesSet } from '@/lib/feed-mix-nav'
import { useTapAck } from '@/hooks/use-tap-ack'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

type EchoSetCard = {
  id: string
  title: string
  isActive: boolean
  answerCount: number
  avatarUrls: string[]
  latestAnswer?: {
    displayName: string
    username?: string
    timeLabel: string
    payload: EchoSongPayload
  } | null
}

export function FeedEchoesTab({ fetchEnabled = true }: { fetchEnabled?: boolean }) {
  const router = useRouter()
  const { ack, isAcked } = useTapAck()
  const [sets, setSets] = useState<EchoSetCard[]>([])
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!fetchEnabled || loadedRef.current) return
    let active = true
    void fetch('/api/echoes/sets')
      .then((r) => r.json())
      .then((data: { sets?: EchoSetCard[] }) => {
        if (active) {
          setSets(data.sets || [])
          loadedRef.current = true
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetchEnabled])

  const openSet = (id: string) => {
    openFeedEchoesSet(router, id)
  }

  if (loading) {
    return (
      <main className="margo-feed-column margo-feed-echoes-tab" style={{ padding: '12px 14px var(--margo-page-padding-bottom)' }}>
        <article className="margo-feed-echoes-tab__card margo-feed-echoes-tab__card--skeleton" aria-busy="true" aria-label="Loading set">
          <div className="margo-feed-echoes-tab__sk-title" />
          <div className="margo-feed-echoes-tab__sk-meta" />
          <div className="margo-feed-echoes-tab__sk-preview" />
        </article>
      </main>
    )
  }

  const activeSet = sets.find((s) => s.isActive)
  const countLabel = activeSet
    ? activeSet.answerCount === 1
      ? '1 answer'
      : `${activeSet.answerCount} answers`
    : ''

  return (
    <main className="margo-feed-column margo-feed-echoes-tab" style={{ padding: '12px 14px var(--margo-page-padding-bottom)' }}>
      {activeSet ? (
        <article className="margo-feed-echoes-tab__card margo-mix-press">
          <button
            type="button"
            className="margo-feed-echoes-tab__card-main"
            data-margo-acked={isAcked(activeSet.id) ? 1 : undefined}
            onPointerDown={() => ack(activeSet.id)}
            onClick={() => openSet(activeSet.id)}
          >
            <p className="margo-feed-echoes-tab__kicker" style={{ fontFamily: font }}>
              Echoes
            </p>
            <p className="margo-feed-echoes-tab__title" style={{ fontFamily: font }}>
              {activeSet.title}
            </p>
            <p className="margo-feed-echoes-tab__count" style={{ fontFamily: font }}>
              {countLabel}
            </p>
            <div className="margo-feed-echoes-tab__avatars" aria-hidden>
              {activeSet.avatarUrls.slice(0, 3).map((url, i) => (
                <MargoAvatar key={`${url}-${i}`} size="sm" imageUrl={url} displayName="Member" />
              ))}
              {activeSet.answerCount > 3 ? (
                <span className="margo-feed-echoes-tab__more" style={{ fontFamily: font }}>
                  And {activeSet.answerCount - 3} more
                </span>
              ) : null}
            </div>
            {activeSet.latestAnswer ? (
              <div className="margo-feed-echoes-tab__preview">
                <p className="margo-feed-echoes-tab__preview-name" style={{ fontFamily: font }}>
                  {activeSet.latestAnswer.displayName}
                  <span className="margo-feed-echoes-results__time">{activeSet.latestAnswer.timeLabel}</span>
                </p>
                <EchoesSongStrip payload={activeSet.latestAnswer.payload} />
              </div>
            ) : null}
          </button>
          <button type="button" className="margo-feed-memory-card__action" aria-label="Open" onClick={() => openSet(activeSet.id)}>
            <ChevronRightIcon size={18} color="var(--bg)" />
          </button>
        </article>
      ) : null}
      <article className="margo-feed-echoes-tab__future">
        <p className="margo-feed-echoes-tab__future-title" style={{ fontFamily: font }}>
          Next question
        </p>
        <p className="margo-feed-echoes-tab__future-line" style={{ fontFamily: font }}>
          Future questions appear here as their own set
        </p>
      </article>
      {sets.filter((s) => !s.isActive).map((set) => (
        <button
          key={set.id}
          type="button"
          className="margo-feed-echoes-tab__link margo-mix-press"
          data-margo-acked={isAcked(set.id) ? 1 : undefined}
          onPointerDown={() => ack(set.id)}
          onClick={() => openSet(set.id)}
        >
          {set.title}
        </button>
      ))}
    </main>
  )
}

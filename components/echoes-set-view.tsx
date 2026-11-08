'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditIcon } from '@/components/icons'
import { MargoAvatar } from '@/components/margo-avatar'
import type { EchoAnswerRow } from '@/lib/echoes/types'
import { EchoesSongStrip } from '@/components/echoes-song-strip'
import { feedReturnFallbackHref } from '@/lib/feed-exit-nav'
import { openFeedEchoesAnswer, openFeedEchoesPerson } from '@/lib/feed-mix-nav'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useTapAck } from '@/hooks/use-tap-ack'
import { useRegisterNavBack } from '@/components/nav-back'
import { FEED_TYPE_SCALE, TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function EchoesSetView({ setId }: { setId: string }) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const { ack, isAcked } = useTapAck()
  const [filter, setFilter] = useState<'following' | 'everyone'>('following')
  const [title, setTitle] = useState('')
  const [questionId, setQuestionId] = useState('')
  const [answerCount, setAnswerCount] = useState(0)
  const [rows, setRows] = useState<EchoAnswerRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/echoes/sets/${encodeURIComponent(setId)}?filter=${filter}`)
      const data = await res.json()
      if (!res.ok) throw new Error()
      setTitle(data.title)
      setQuestionId(data.questionId)
      setAnswerCount(data.answerCount)
      setRows(data.rows || [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [setId, filter])

  useEffect(() => {
    void load()
  }, [load])

  useRegisterNavBack({ preferHistory: true, fallbackHref: feedReturnFallbackHref() })

  const startAnswer = () => {
    if (!requireAuth()) return
    openFeedEchoesAnswer(router, questionId, setId)
  }

  const countLabel = answerCount === 1 ? '1 answer' : `${answerCount} answers`

  return (
    <div className="margo-echoes-set-page">
      <header className="margo-echoes-set-page__head">
        <div>
          <p className="margo-echoes-set-page__kicker" style={{ fontFamily: font }}>
            Echoes
          </p>
          <h1 className="margo-echoes-set-page__title" style={{ fontFamily: font, fontSize: TYPE.body }}>
            {title || 'What are you listening to?'}
          </h1>
          <p className="margo-echoes-set-page__count" style={{ fontFamily: font, fontSize: FEED_TYPE_SCALE.sectionLabel }}>
            {countLabel}
          </p>
        </div>
        <button type="button" className="margo-feed-memory-card__action" aria-label="Answer" onClick={startAnswer}>
          <EditIcon size={16} color="var(--bg)" />
        </button>
      </header>
      <div className="margo-echoes-set-page__filters" role="tablist">
        <button
          type="button"
          className={`margo-echoes-set-page__filter${filter === 'following' ? ' margo-echoes-set-page__filter--active' : ''}`}
          onClick={() => setFilter('following')}
          style={{ fontFamily: font }}
        >
          Following
        </button>
        <button
          type="button"
          className={`margo-echoes-set-page__filter${filter === 'everyone' ? ' margo-echoes-set-page__filter--active' : ''}`}
          onClick={() => setFilter('everyone')}
          style={{ fontFamily: font }}
        >
          Everyone
        </button>
      </div>
      {loading ? (
        <ul className="margo-echoes-set-page__list" aria-busy="true" aria-label="Loading answers">
          <li className="margo-echoes-set-page__card margo-echoes-set-page__card--skeleton" />
          <li className="margo-echoes-set-page__card margo-echoes-set-page__card--skeleton" />
        </ul>
      ) : (
        <ul className="margo-echoes-set-page__list">
          {rows.map((row) => (
            <li key={row.answerId}>
              <button
                type="button"
                className="margo-echoes-set-page__card"
                data-margo-acked={isAcked(row.profileId) ? 1 : undefined}
                onPointerDown={() => ack(row.profileId)}
                onClick={() => openFeedEchoesPerson(router, setId, row.profileId)}
              >
                <div className="margo-echoes-set-page__identity">
                  <MargoAvatar size="md" imageUrl={row.avatarUrl} username={row.username} displayName={row.displayName} />
                  <div className="margo-echoes-set-page__who">
                    <p className="margo-echoes-set-page__name" style={{ fontFamily: font, fontSize: FEED_TYPE_SCALE.displayName }}>
                      {row.isOwn ? 'You' : row.displayName}
                    </p>
                    <p className="margo-echoes-set-page__handle" style={{ fontFamily: font, fontSize: FEED_TYPE_SCALE.handle }}>
                      @{row.username}
                      <span className="margo-echoes-set-page__time">{row.timeLabel}</span>
                    </p>
                  </div>
                </div>
                <EchoesSongStrip payload={row.payload} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditIcon } from '@/components/icons'
import { MargoAvatar } from '@/components/margo-avatar'
import { MargoSearchInput } from '@/components/margo-search-input'
import type { EchoAnswerRow } from '@/lib/echoes/types'
import { EchoesSongStrip } from '@/components/echoes-song-strip'
import { feedReturnFallbackHref } from '@/lib/feed-exit-nav'
import { openFeedEchoesAnswer, openFeedEchoesPerson } from '@/lib/feed-mix-nav'
import {
  ECHO_SET_FETCH_ROWS,
  ECHO_SET_MAX_FETCH_ROWS,
  ECHO_SET_PAGE_ROWS,
  filterEchoRows,
  formatAnswerCount,
  topEchoSongs,
} from '@/lib/echoes/set-list'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useTapAck } from '@/hooks/use-tap-ack'
import { useRegisterNavBack } from '@/components/nav-back'
import { FEED_TYPE_SCALE, TYPE, UI_FONT } from '@/lib/fonts'
import { AuthorMeta } from '@/components/username-tag'

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
  const [fetchLimit, setFetchLimit] = useState(ECHO_SET_FETCH_ROWS)
  const [visible, setVisible] = useState(ECHO_SET_PAGE_ROWS)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/echoes/sets/${encodeURIComponent(setId)}?filter=${filter}&limit=${fetchLimit}`,
      )
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
  }, [setId, filter, fetchLimit])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setVisible(ECHO_SET_PAGE_ROWS)
  }, [filter, query, setId])

  useRegisterNavBack({ preferHistory: true, fallbackHref: feedReturnFallbackHref() })

  const startAnswer = () => {
    if (!requireAuth()) return
    openFeedEchoesAnswer(router, questionId, setId)
  }

  const filtered = useMemo(() => filterEchoRows(rows, query), [rows, query])
  const topSongs = useMemo(() => topEchoSongs(rows), [rows])
  const shown = filtered.slice(0, visible)
  const canShowMore = visible < filtered.length
  const canFetchMore = !query && rows.length >= fetchLimit && rows.length < answerCount && fetchLimit < ECHO_SET_MAX_FETCH_ROWS

  const showMore = () => {
    if (canShowMore) {
      setVisible((v) => v + ECHO_SET_PAGE_ROWS)
      return
    }
    if (canFetchMore) setFetchLimit((v) => Math.min(v + ECHO_SET_FETCH_ROWS, ECHO_SET_MAX_FETCH_ROWS))
  }

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
            {formatAnswerCount(answerCount)}
          </p>
        </div>
        <button type="button" className="margo-feed-memory-card__action" aria-label="Answer" onClick={startAnswer}>
          <EditIcon size={16} color="var(--bg)" />
        </button>
      </header>

      {topSongs.length > 0 ? (
        <div className="margo-echoes-set-page__top" aria-label="Most picked songs">
          <p className="margo-echoes-set-page__top-label" style={{ fontFamily: font }}>
            Most picked
          </p>
          <div className="margo-echoes-set-page__top-chips">
            {topSongs.map((song) => (
              <button
                key={`${song.title}-${song.artist}`}
                type="button"
                className="margo-echoes-set-page__top-chip"
                style={{ fontFamily: font }}
                onClick={() => setQuery(song.title)}
              >
                {song.title} · {song.count.toLocaleString('en-US')}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="margo-echoes-set-page__search">
        <MargoSearchInput
          value={query}
          onChange={setQuery}
          hintText="Search people or songs"
          ariaLabel="Search people or songs"
        />
      </div>

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
        <>
          <ul className="margo-echoes-set-page__list">
            {shown.map((row) => (
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
                      <AuthorMeta
                        username={row.username}
                        size="compact"
                        metaAfterHandle={
                          <span className="margo-echoes-set-page__time" style={{ fontFamily: font, fontSize: FEED_TYPE_SCALE.handle }}>
                            {row.isOwn ? 'You · ' : ''}
                            {row.timeLabel}
                          </span>
                        }
                      />
                    </div>
                  </div>
                  <EchoesSongStrip payload={row.payload} />
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 ? (
            <p className="margo-echoes-set-page__empty" style={{ fontFamily: font }}>
              No answers match.
            </p>
          ) : (
            <p className="margo-echoes-set-page__showing" style={{ fontFamily: font }}>
              Showing {shown.length.toLocaleString('en-US')} of {filtered.length.toLocaleString('en-US')}
              {query ? ' matching' : ' loaded'} · {formatAnswerCount(answerCount)} in total
            </p>
          )}
          {canShowMore || canFetchMore ? (
            <button
              type="button"
              className="margo-echoes-set-page__more margo-mix-press"
              style={{ fontFamily: font }}
              onClick={showMore}
            >
              Show more answers
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}

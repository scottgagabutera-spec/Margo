'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EditIcon } from '@/components/icons'
import { MargoAvatar } from '@/components/margo-avatar'
import type { EchoAnswerRow } from '@/lib/echoes/types'
import { saveMargoReturn } from '@/lib/margo-scroll-return'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useRegisterNavBack } from '@/components/nav-back'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function EchoesSetView({ setId }: { setId: string }) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
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

  useRegisterNavBack({ preferHistory: true, fallbackHref: '/feed?tab=echoes' })

  const startAnswer = () => {
    if (!requireAuth()) return
    saveMargoReturn({ href: `/echoes/${setId}`, feedTab: 'echoes' })
    router.push(`/echoes/answer?questionId=${encodeURIComponent(questionId)}&setId=${encodeURIComponent(setId)}`)
  }

  const countLabel = answerCount === 1 ? '1 answer' : `${answerCount} answers`

  return (
    <div className="margo-echoes-set-page">
      <header className="margo-echoes-set-page__head">
        <div>
          <h1 className="margo-echoes-set-page__title" style={{ fontFamily: font }}>
            {title || 'Echoes'}
          </h1>
          <p className="margo-echoes-set-page__count" style={{ fontFamily: font }}>
            {countLabel}
          </p>
        </div>
        <button type="button" className="margo-feed-memory-card__action" aria-label="Edit answer" onClick={startAnswer}>
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
        <p className="margo-echoes-set-page__loading" style={{ fontFamily: font }}>
          Loading
        </p>
      ) : (
        <ul className="margo-echoes-set-page__list">
          {rows.map((row) => (
            <li key={row.answerId} className="margo-echoes-set-page__row">
              <Link
                href={`/echoes/${setId}/${row.profileId}`}
                className="margo-echoes-set-page__row-link"
                onClick={() => saveMargoReturn({ href: `/echoes/${setId}`, feedTab: 'echoes' })}
              >
                <MargoAvatar size="md" imageUrl={row.avatarUrl} username={row.username} displayName={row.displayName} />
                <div>
                  <p className="margo-echoes-set-page__name" style={{ fontFamily: font }}>
                    {row.isOwn ? 'You' : row.displayName}
                  </p>
                  <p className="margo-echoes-set-page__songs" style={{ fontFamily: font }}>
                    {row.songLine}
                  </p>
                </div>
              </Link>
              <span className="margo-echoes-set-page__time" style={{ fontFamily: font }}>
                {row.timeLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

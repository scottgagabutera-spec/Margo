'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { MargoAvatar } from '@/components/margo-avatar'
import { persistFeedReturnBeforeLeave } from '@/lib/margo-feed-return'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

type EchoSetCard = {
  id: string
  title: string
  isActive: boolean
  answerCount: number
  avatarUrls: string[]
}

export function FeedEchoesTab() {
  const router = useRouter()
  const [sets, setSets] = useState<EchoSetCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetch('/api/echoes/sets')
      .then((r) => r.json())
      .then((data: { sets?: EchoSetCard[] }) => {
        if (active) setSets(data.sets || [])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const openSet = (id: string) => {
    persistFeedReturnBeforeLeave('echoes')
    router.push(`/echoes/${id}`)
  }

  if (loading) {
    return (
      <p className="margo-feed-echoes-tab__empty" style={{ fontFamily: font }}>
        Loading
      </p>
    )
  }

  const activeSet = sets.find((s) => s.isActive)

  return (
    <main className="margo-feed-column margo-feed-echoes-tab" style={{ padding: '12px 14px var(--margo-page-padding-bottom)' }}>
      {activeSet ? (
        <article className="margo-feed-echoes-tab__card">
          <button type="button" className="margo-feed-echoes-tab__card-main" onClick={() => openSet(activeSet.id)}>
            <p className="margo-feed-echoes-tab__title" style={{ fontFamily: font }}>
              {activeSet.title}
            </p>
            <div className="margo-feed-echoes-tab__avatars" aria-hidden>
              {activeSet.avatarUrls.slice(0, 3).map((url, i) => (
                <MargoAvatar key={`${url}-${i}`} size="sm" imageUrl={url} displayName="Member" />
              ))}
              {activeSet.answerCount > 3 ? (
                <span className="margo-feed-echoes-tab__more" style={{ fontFamily: font }}>
                  and {activeSet.answerCount - 3} more
                </span>
              ) : null}
            </div>
          </button>
          <button
            type="button"
            className="margo-feed-memory-card__action"
            aria-label="Open"
            onClick={() => openSet(activeSet.id)}
          >
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
        <Link
          key={set.id}
          href={`/echoes/${set.id}`}
          className="margo-feed-echoes-tab__link"
          onClick={() => persistFeedReturnBeforeLeave('echoes')}
        >
          {set.title}
        </Link>
      ))}
    </main>
  )
}

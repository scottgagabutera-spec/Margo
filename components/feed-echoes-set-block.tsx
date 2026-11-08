'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon, EditIcon } from '@/components/icons'
import { MargoAvatar } from '@/components/margo-avatar'
import type { EchoFeedBlockSnapshot } from '@/lib/echoes/types'
import { persistFeedReturnBeforeLeave } from '@/lib/margo-feed-return'
import { leaveFeedTo } from '@/lib/feed-exit-nav'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedEchoesSetBlock({ block, signedIn }: { block: EchoFeedBlockSnapshot; signedIn: boolean }) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()

  const openSet = () => {
    leaveFeedTo(router, `/echoes/${block.setId}`, 'lyrics')
  }

  const startAnswer = () => {
    if (!requireAuth()) return
    leaveFeedTo(router, `/echoes/answer?questionId=${encodeURIComponent(block.questionId)}&setId=${encodeURIComponent(block.setId)}`, 'lyrics')
  }

  const countLabel = block.answerCount === 1 ? '1 answer' : `${block.answerCount} answers`

  return (
    <article className="margo-feed-echoes-set margo-pressable-surface">
      <div className="margo-feed-echoes-set__head">
        <div className="margo-feed-echoes-set__titles">
          <p className="margo-feed-echoes-set__title" style={{ fontFamily: font }}>
            {block.title}
          </p>
          <p className="margo-feed-echoes-set__count" style={{ fontFamily: font }}>
            {countLabel}
          </p>
        </div>
        <button
          type="button"
          className="margo-feed-memory-card__action"
          aria-label="Open set"
          onClick={openSet}
        >
          <ChevronRightIcon size={18} color="var(--bg)" />
        </button>
      </div>
      <ul className="margo-feed-echoes-set__list">
        {block.preview.map((row) => (
          <li key={row.answerId} className="margo-feed-echoes-set__row">
            <Link
              href={`/echoes/${block.setId}/${row.profileId}`}
              className="margo-feed-echoes-set__user-link"
              onClick={() => persistFeedReturnBeforeLeave('lyrics')}
            >
              <MargoAvatar size="sm" imageUrl={row.avatarUrl} username={row.username} displayName={row.displayName} />
              <div className="margo-feed-echoes-set__user-meta">
                <p className="margo-feed-echoes-set__name" style={{ fontFamily: font }}>
                  {row.isOwn ? 'You' : row.displayName}
                </p>
                <p className="margo-feed-echoes-set__songs" style={{ fontFamily: font }}>
                  {row.songLine || 'Songs'}
                </p>
              </div>
            </Link>
            <span className="margo-feed-echoes-set__time" style={{ fontFamily: font }}>
              {row.timeLabel}
            </span>
            {signedIn && !row.isOwn ? (
              <span className="margo-feed-echoes-set__row-spacer" aria-hidden />
            ) : row.isOwn ? (
              <button
                type="button"
                className="margo-feed-memory-card__action"
                aria-label="Edit answer"
                onClick={startAnswer}
              >
                <EditIcon size={16} color="var(--bg)" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {signedIn ? (
        <div className="margo-feed-echoes-set__foot">
          <button type="button" className="margo-feed-echoes-set__answer" onClick={startAnswer}>
            <span className="margo-feed-memory-card__action" aria-hidden>
              <EditIcon size={16} color="var(--bg)" />
            </span>
            <span style={{ fontFamily: font }}>Add your answer</span>
          </button>
        </div>
      ) : (
        <p className="margo-feed-echoes-set__signin" style={{ fontFamily: font }}>
          Sign in to answer
        </p>
      )}
    </article>
  )
}

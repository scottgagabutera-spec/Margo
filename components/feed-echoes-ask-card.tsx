'use client'

import { useRouter } from 'next/navigation'
import { EditIcon } from '@/components/icons'
import type { EchoFeedBlockSnapshot } from '@/lib/echoes/types'
import { openFeedEchoesAnswer } from '@/lib/feed-mix-nav'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useTapAck } from '@/hooks/use-tap-ack'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedEchoesAskCard({ block, signedIn }: { block: EchoFeedBlockSnapshot; signedIn: boolean }) {
  const router = useRouter()
  const { requireAuth } = useAuthGate()
  const { ack, isAcked } = useTapAck()

  const startAnswer = () => {
    if (!requireAuth()) return
    openFeedEchoesAnswer(router, block.questionId, block.setId)
  }

  return (
    <article
      className="margo-feed-echoes-ask margo-mix-press"
      data-feed-exit="echoes-ask"
      role="button"
      tabIndex={0}
      data-margo-acked={isAcked() ? 1 : undefined}
      aria-busy={isAcked() || undefined}
      onPointerDown={() => ack()}
      onClick={startAnswer}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          startAnswer()
        }
      }}
    >
      <div className="margo-feed-echoes-ask__body">
        <p className="margo-feed-echoes-ask__title" style={{ fontFamily: font }}>
          {block.title || 'What are you listening to?'}
        </p>
        <p className="margo-feed-echoes-ask__line" style={{ fontFamily: font }}>
          Tell people your songs this week.
        </p>
      </div>
      {signedIn ? (
        <span className="margo-icon-hit-44" aria-hidden>
          <span className="margo-gold-square-30">
            <EditIcon size={16} color="var(--bg)" />
          </span>
        </span>
      ) : (
        <p className="margo-feed-echoes-ask__signin" style={{ fontFamily: font }}>
          Sign in to answer
        </p>
      )}
    </article>
  )
}
